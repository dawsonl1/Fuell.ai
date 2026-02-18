"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useCompose } from "@/components/compose-email-context";
import Navigation from "@/components/navigation";
import { FollowUpModal } from "@/components/follow-up-modal";
import type {
  EmailMessage,
  EmailMessageFull,
  EmailFollowUp,
  ScheduledEmail,
} from "@/lib/types";
import {
  Inbox,
  Clock,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Reply,
  Search,
  RefreshCw,
  PenSquare,
  XCircle,
  Pencil,
  Mail,
  Trash2,
  EyeOff,
  Eye,
  FolderInput,
  RotateCcw,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──

type EmailThread = {
  threadId: string;
  subject: string;
  messages: EmailMessage[];
  latestDate: string;
  latestDirection: string | null;
  contactId: number | null;
};

type GmailLabel = { id: string; name: string; type: string };

type SidebarTab = "inbox" | "sent" | "scheduled" | "followups" | "trash" | "hidden";

// ── Page ──

export default function InboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { gmailConnected, openCompose } = useCompose();

  const [activeTab, setActiveTab] = useState<SidebarTab>("inbox");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Data
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [trashedEmails, setTrashedEmails] = useState<EmailMessage[]>([]);
  const [hiddenEmails, setHiddenEmails] = useState<EmailMessage[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [followUps, setFollowUps] = useState<EmailFollowUp[]>([]);
  const [contactMap, setContactMap] = useState<Record<number, string>>({});
  const [gmailAddress, setGmailAddress] = useState("");
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([]);

  // Thread expansion
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [expandedEmailContent, setExpandedEmailContent] = useState<EmailMessageFull | null>(null);
  const [loadingEmailContent, setLoadingEmailContent] = useState(false);

  // Search + contact filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [contactFilterOpen, setContactFilterOpen] = useState(false);
  const contactFilterRef = useRef<HTMLDivElement>(null);

  // Move-to-folder dropdown
  const [moveDropdownMsgId, setMoveDropdownMsgId] = useState<string | null>(null);
  const moveDropdownRef = useRef<HTMLDivElement>(null);

  // Follow-up modal
  const [followUpModal, setFollowUpModal] = useState<{
    recipientEmail: string;
    contactName: string | null;
    originalSubject: string;
    originalSentAt: string;
    originalGmailMessageId: string;
    threadId: string;
    scheduledEmailId?: number | null;
    existingFollowUp?: EmailFollowUp | null;
  } | null>(null);

  // ── Data loading ──

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/gmail/inbox");
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
        setTrashedEmails(data.trashedEmails || []);
        setHiddenEmails(data.hiddenEmails || []);
        setScheduledEmails(data.scheduledEmails || []);
        setFollowUps(data.followUps || []);
        setContactMap(data.contactMap || {});
        setGmailAddress(data.gmailAddress || "");
      }
    } catch (err) {
      console.error("Failed to load inbox:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && gmailConnected) {
      loadInbox();
      fetch("/api/gmail/labels")
        .then((r) => r.json())
        .then((d) => setGmailLabels(d.labels || []))
        .catch(() => {});
    } else {
      setLoading(false);
    }
  }, [user, gmailConnected, loadInbox]);

  useEffect(() => {
    const handler = () => setTimeout(() => loadInbox(), 500);
    window.addEventListener("careervine:email-sent", handler);
    return () => window.removeEventListener("careervine:email-sent", handler);
  }, [loadInbox]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveDropdownMsgId && moveDropdownRef.current && !moveDropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownMsgId(null);
      }
      if (contactFilterOpen && contactFilterRef.current && !contactFilterRef.current.contains(e.target as Node)) {
        setContactFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moveDropdownMsgId, contactFilterOpen]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/gmail/sync", { method: "POST" });
      await loadInbox();
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  // ── Thread grouping ──

  const buildThreads = (msgs: EmailMessage[]): EmailThread[] => {
    const map = new Map<string, EmailMessage[]>();
    for (const email of msgs) {
      const tid = email.thread_id || email.gmail_message_id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(email);
    }
    const result: EmailThread[] = [];
    for (const [threadId, threadMsgs] of map) {
      threadMsgs.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      const latest = threadMsgs[threadMsgs.length - 1];
      result.push({
        threadId,
        subject: threadMsgs[0].subject || "(no subject)",
        messages: threadMsgs,
        latestDate: latest.date || "",
        latestDirection: latest.direction,
        contactId: threadMsgs[0].matched_contact_id,
      });
    }
    result.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
    return result;
  };

  const inboxThreads = useMemo(() => buildThreads(emails), [emails]);
  const sentEmails = useMemo(() => emails.filter((e) => e.direction === "outbound"), [emails]);
  const sentThreads = useMemo(() => buildThreads(sentEmails), [sentEmails]);
  const trashThreads = useMemo(() => buildThreads(trashedEmails), [trashedEmails]);
  const hiddenThreads = useMemo(() => buildThreads(hiddenEmails), [hiddenEmails]);

  // Contact list for filter
  const contactsInEmails = useMemo(() => {
    const ids = new Set<number>();
    for (const e of emails) {
      if (e.matched_contact_id) ids.add(e.matched_contact_id);
    }
    return Array.from(ids)
      .map((id) => ({ id, name: contactMap[id] || `Contact #${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [emails, contactMap]);

  // ── Search + contact filtering ──

  const filterThreads = useCallback(
    (threads: EmailThread[]) => {
      let filtered = threads;

      if (selectedContactId !== null) {
        filtered = filtered.filter((t) => t.contactId === selectedContactId);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.subject.toLowerCase().includes(q) ||
            t.messages.some(
              (m) =>
                m.snippet?.toLowerCase().includes(q) ||
                m.from_address?.toLowerCase().includes(q) ||
                m.to_addresses?.some((a) => a.toLowerCase().includes(q))
            ) ||
            (t.contactId && contactMap[t.contactId]?.toLowerCase().includes(q))
        );
      }

      return filtered;
    },
    [searchQuery, selectedContactId, contactMap]
  );

  const filteredInboxThreads = useMemo(() => filterThreads(inboxThreads), [filterThreads, inboxThreads]);
  const filteredSentThreads = useMemo(() => filterThreads(sentThreads), [filterThreads, sentThreads]);
  const filteredTrashThreads = useMemo(() => filterThreads(trashThreads), [filterThreads, trashThreads]);
  const filteredHiddenThreads = useMemo(() => filterThreads(hiddenThreads), [filterThreads, hiddenThreads]);

  // ── Follow-up lookup ──

  const followUpsByThread = useMemo(() => {
    const map: Record<string, EmailFollowUp[]> = {};
    for (const fu of followUps) {
      if (!map[fu.thread_id]) map[fu.thread_id] = [];
      map[fu.thread_id].push(fu);
    }
    return map;
  }, [followUps]);

  // ── Email expand (handles single-message auto-expand) ──

  const handleExpandEmail = async (gmailMessageId: string) => {
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
      return;
    }
    setExpandedEmailId(gmailMessageId);
    setExpandedEmailContent(null);
    setLoadingEmailContent(true);

    const allMsgs = [...emails, ...trashedEmails, ...hiddenEmails];
    const msg = allMsgs.find((e) => e.gmail_message_id === gmailMessageId);
    if (msg && !msg.is_read && msg.direction === "inbound") {
      setEmails((prev) => prev.map((e) => (e.gmail_message_id === gmailMessageId ? { ...e, is_read: true } : e)));
      window.dispatchEvent(new CustomEvent("careervine:unread-changed", { detail: { delta: -1 } }));
      fetch(`/api/gmail/emails/${gmailMessageId}/read`, { method: "POST" }).catch(() => {});
    } else if (msg && !msg.is_read) {
      setEmails((prev) => prev.map((e) => (e.gmail_message_id === gmailMessageId ? { ...e, is_read: true } : e)));
      fetch(`/api/gmail/emails/${gmailMessageId}/read`, { method: "POST" }).catch(() => {});
    }

    try {
      const res = await fetch(`/api/gmail/emails/${gmailMessageId}`);
      const data = await res.json();
      if (data.success) setExpandedEmailContent(data.message);
    } catch (err) {
      console.error("Error loading email:", err);
    } finally {
      setLoadingEmailContent(false);
    }
  };

  const handleThreadClick = (thread: EmailThread) => {
    const isExpanded = expandedThreadId === thread.threadId;
    if (isExpanded) {
      setExpandedThreadId(null);
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
      setMoveDropdownMsgId(null);
      return;
    }

    setExpandedThreadId(thread.threadId);
    setMoveDropdownMsgId(null);

    // Single message => auto-expand its content
    if (thread.messages.length === 1) {
      handleExpandEmail(thread.messages[0].gmail_message_id);
    } else {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
  };

  // ── Email actions ──

  const handleTrashEmail = async (gmailMessageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trashed = emails.find((em) => em.gmail_message_id === gmailMessageId);
    setEmails((prev) => prev.filter((em) => em.gmail_message_id !== gmailMessageId));
    if (trashed) setTrashedEmails((prev) => [{ ...trashed, is_trashed: true }, ...prev]);
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
    fetch(`/api/gmail/emails/${gmailMessageId}/trash`, { method: "POST" }).catch(() => {});
    const delta = trashed && !trashed.is_read && trashed.direction === "inbound" ? -1 : 0;
    window.dispatchEvent(new CustomEvent("careervine:unread-changed", { detail: { delta } }));
  };

  const handleRestoreEmail = async (gmailMessageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const restored = trashedEmails.find((em) => em.gmail_message_id === gmailMessageId);
    setTrashedEmails((prev) => prev.filter((em) => em.gmail_message_id !== gmailMessageId));
    if (restored) setEmails((prev) => [{ ...restored, is_trashed: false }, ...prev]);
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
    fetch(`/api/gmail/emails/${gmailMessageId}/trash`, { method: "DELETE" }).catch(() => {});
  };

  const handleHideEmail = async (gmailMessageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const hidden = emails.find((em) => em.gmail_message_id === gmailMessageId);
    setEmails((prev) => prev.filter((em) => em.gmail_message_id !== gmailMessageId));
    if (hidden) setHiddenEmails((prev) => [{ ...hidden, is_hidden: true }, ...prev]);
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
    fetch(`/api/gmail/emails/${gmailMessageId}/hide`, { method: "POST" }).catch(() => {});
    const delta = hidden && !hidden.is_read && hidden.direction === "inbound" ? -1 : 0;
    window.dispatchEvent(new CustomEvent("careervine:unread-changed", { detail: { delta } }));
  };

  const handleUnhideEmail = async (gmailMessageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const unhidden = hiddenEmails.find((em) => em.gmail_message_id === gmailMessageId);
    setHiddenEmails((prev) => prev.filter((em) => em.gmail_message_id !== gmailMessageId));
    if (unhidden) setEmails((prev) => [{ ...unhidden, is_hidden: false }, ...prev]);
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
    fetch(`/api/gmail/emails/${gmailMessageId}/hide`, { method: "DELETE" }).catch(() => {});
  };

  const handleMoveEmail = async (gmailMessageId: string, labelId: string) => {
    setEmails((prev) => prev.filter((em) => em.gmail_message_id !== gmailMessageId));
    setMoveDropdownMsgId(null);
    if (expandedEmailId === gmailMessageId) {
      setExpandedEmailId(null);
      setExpandedEmailContent(null);
    }
    fetch(`/api/gmail/emails/${gmailMessageId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelId }),
    }).catch(() => {});
    window.dispatchEvent(new CustomEvent("careervine:unread-changed"));
  };

  // ── Scheduled / Follow-up cancel ──

  const cancelScheduledEmail = async (id: number) => {
    try {
      const res = await fetch(`/api/gmail/schedule/${id}`, { method: "DELETE" });
      if (res.ok) {
        setScheduledEmails((prev) => prev.filter((e) => e.id !== id));
        setFollowUps((prev) => prev.filter((fu) => fu.scheduled_email_id !== id));
      }
    } catch (err) {
      console.error("Error cancelling scheduled email:", err);
    }
  };

  const cancelFollowUp = async (followUpId: number) => {
    try {
      const res = await fetch(`/api/gmail/follow-ups/${followUpId}`, { method: "DELETE" });
      if (res.ok) setFollowUps((prev) => prev.filter((fu) => fu.id !== followUpId));
    } catch (err) {
      console.error("Error cancelling follow-up:", err);
    }
  };

  // ── Date helpers ──

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateFull = (dateStr: string) =>
    new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  // ── Not connected ──

  if (!loading && !gmailConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-on-primary-container" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2">Connect your Gmail</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your Gmail account in Settings to see your email conversations with contacts.
          </p>
          <Button onClick={() => router.push("/settings")}>Go to Settings</Button>
        </div>
      </div>
    );
  }

  // ── Sidebar counts ──

  const unreadEmailCount = emails.filter((e) => !e.is_read && e.direction === "inbound").length;
  const sentCount = sentEmails.length;
  const pendingFollowUpCount = followUps.reduce(
    (sum, fu) => sum + fu.email_follow_up_messages.filter((m) => m.status === "pending").length,
    0
  );

  // ── Determine tab context for action rendering ──

  type TabContext = "inbox" | "sent" | "trash" | "hidden";

  const getTabContext = (): TabContext => {
    if (activeTab === "trash") return "trash";
    if (activeTab === "hidden") return "hidden";
    if (activeTab === "sent") return "sent";
    return "inbox";
  };

  // ── Inline action icons for collapsed message rows ──

  const renderMsgRowActions = (msg: EmailMessage, tabCtx: TabContext) => (
    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/msg:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
      {tabCtx === "trash" && (
        <button type="button" onClick={(e) => handleRestoreEmail(msg.gmail_message_id, e)} className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors cursor-pointer" title="Restore">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
      {tabCtx === "hidden" && (
        <button type="button" onClick={(e) => handleUnhideEmail(msg.gmail_message_id, e)} className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors cursor-pointer" title="Unhide">
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
      {(tabCtx === "inbox" || tabCtx === "sent") && (
        <>
          {gmailLabels.length > 0 && (
            <div className="relative" ref={moveDropdownMsgId === msg.gmail_message_id ? moveDropdownRef : undefined}>
              <button
                type="button"
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Move to folder"
                onClick={(e) => { e.stopPropagation(); setMoveDropdownMsgId(moveDropdownMsgId === msg.gmail_message_id ? null : msg.gmail_message_id); }}
              >
                <FolderInput className="h-3.5 w-3.5" />
              </button>
              {moveDropdownMsgId === msg.gmail_message_id && (
                <div className="absolute right-0 top-7 z-50 w-48 max-h-56 overflow-y-auto bg-surface-container-high rounded-xl shadow-lg border border-outline-variant py-1">
                  {gmailLabels.map((label) => (
                    <button key={label.id} type="button" className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-surface-container-low cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); handleMoveEmail(msg.gmail_message_id, label.id); }}>
                      {label.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={(e) => handleHideEmail(msg.gmail_message_id, e)} className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Hide from app">
            <EyeOff className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={(e) => handleTrashEmail(msg.gmail_message_id, e)} className="p-1 rounded-full text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Trash">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );

  // ── Full action bar for expanded email content ──

  const renderEmailActions = (msg: EmailMessage, thread: EmailThread, contactName: string | null, tabCtx: TabContext) => (
    <div className="mt-3 pt-3 border-t border-outline-variant/50 flex items-center gap-3 flex-wrap">
      {tabCtx !== "trash" && tabCtx !== "hidden" && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors"
          onClick={() => {
            if (!expandedEmailContent) return;
            const replyTo = msg.direction === "outbound" ? (msg.to_addresses?.[0] || "") : (msg.from_address || "");
            const subj = expandedEmailContent.subject || "";
            const reSubj = subj.replace(/^(Re:\s*)+/i, "");
            openCompose({
              to: replyTo,
              name: contactName || undefined,
              subject: `Re: ${reSubj}`,
              threadId: expandedEmailContent.threadId,
              inReplyTo: expandedEmailContent.messageId,
              references: expandedEmailContent.messageId,
              quotedHtml: expandedEmailContent.bodyHtml || expandedEmailContent.bodyText || "",
            });
          }}
        >
          <Reply className="h-3.5 w-3.5" />
          Reply
        </button>
      )}
      {tabCtx !== "trash" && tabCtx !== "hidden" && msg.direction === "outbound" && msg.date && (Date.now() - new Date(msg.date).getTime()) < 14 * 86400_000 && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-tertiary hover:text-tertiary/80 cursor-pointer transition-colors"
          onClick={() => {
            setFollowUpModal({
              recipientEmail: msg.to_addresses?.[0] || "",
              contactName: contactName || null,
              originalSubject: expandedEmailContent?.subject || thread.subject,
              originalSentAt: msg.date!,
              originalGmailMessageId: msg.gmail_message_id,
              threadId: thread.threadId,
            });
          }}
        >
          <Clock className="h-3.5 w-3.5" />
          Follow-up
        </button>
      )}
      {contactName && thread.contactId && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={() => router.push(`/contacts/${thread.contactId}`)}
        >
          View contact
        </button>
      )}

      <div className="flex-1" />

      {/* Move to folder */}
      {(tabCtx === "inbox" || tabCtx === "sent") && gmailLabels.length > 0 && (
        <div className="relative" ref={moveDropdownMsgId === msg.gmail_message_id ? moveDropdownRef : undefined}>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={(e) => { e.stopPropagation(); setMoveDropdownMsgId(moveDropdownMsgId === msg.gmail_message_id ? null : msg.gmail_message_id); }}
          >
            <FolderInput className="h-3.5 w-3.5" />
            Move to
            <ChevronDown className="h-3 w-3" />
          </button>
          {moveDropdownMsgId === msg.gmail_message_id && (
            <div className="absolute right-0 bottom-6 z-50 w-48 max-h-56 overflow-y-auto bg-surface-container-high rounded-xl shadow-lg border border-outline-variant py-1">
              {gmailLabels.map((label) => (
                <button key={label.id} type="button" className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-surface-container-low cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); handleMoveEmail(msg.gmail_message_id, label.id); }}>
                  {label.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hide / Unhide */}
      {tabCtx === "hidden" ? (
        <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 cursor-pointer transition-colors" onClick={() => handleUnhideEmail(msg.gmail_message_id)}>
          <Eye className="h-3.5 w-3.5" />
          Unhide
        </button>
      ) : tabCtx !== "trash" ? (
        <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => handleHideEmail(msg.gmail_message_id)} title="Hide from webapp (keeps in Gmail)">
          <EyeOff className="h-3.5 w-3.5" />
          Hide
        </button>
      ) : null}

      {/* Trash / Restore */}
      {tabCtx === "trash" ? (
        <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 cursor-pointer transition-colors" onClick={() => handleRestoreEmail(msg.gmail_message_id)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
      ) : tabCtx !== "hidden" ? (
        <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors" onClick={() => handleTrashEmail(msg.gmail_message_id)} title="Move to trash (Gmail + webapp)">
          <Trash2 className="h-3.5 w-3.5" />
          Trash
        </button>
      ) : null}
    </div>
  );

  // ── Render expanded email body ──

  const renderExpandedContent = (msg: EmailMessage, thread: EmailThread, contactName: string | null, tabCtx: TabContext) => (
    <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/50">
      {loadingEmailContent ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
          <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent" />
          Loading email…
        </div>
      ) : expandedEmailContent ? (
        <div>
          <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
            <p><span className="font-medium">From:</span> {expandedEmailContent.from}</p>
            <p><span className="font-medium">To:</span> {expandedEmailContent.to}</p>
            <p><span className="font-medium">Date:</span> {expandedEmailContent.date ? new Date(expandedEmailContent.date).toLocaleString() : ""}</p>
          </div>
          {expandedEmailContent.bodyHtml ? (
            <div className="text-sm prose prose-sm max-w-none [&_*]:!text-foreground [&_a]:!text-primary overflow-auto max-h-80" dangerouslySetInnerHTML={{ __html: expandedEmailContent.bodyHtml }} />
          ) : (
            <pre className="text-sm text-foreground whitespace-pre-wrap overflow-auto max-h-80">{expandedEmailContent.bodyText || "No content available"}</pre>
          )}
          {renderEmailActions(msg, thread, contactName, tabCtx)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Failed to load email content.</p>
      )}
    </div>
  );

  // ── Render thread list ──

  const renderThreadList = (threadList: EmailThread[], tabCtx: TabContext) => {
    if (threadList.length === 0) {
      const iconMap: Record<string, typeof Inbox> = { inbox: Inbox, sent: Send, trash: Trash2, hidden: EyeOff };
      const EmptyIcon = iconMap[tabCtx] || Inbox;
      const msgMap: Record<string, string> = {
        inbox: searchQuery || selectedContactId ? "No emails match your filters." : "No emails synced yet.",
        sent: "No sent emails yet.",
        trash: "Trash is empty.",
        hidden: "No hidden emails.",
      };
      return (
        <div className="text-center py-16">
          <EmptyIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{msgMap[tabCtx]}</p>
        </div>
      );
    }

    return (
      <div className="border border-outline-variant/50 rounded-xl overflow-hidden divide-y divide-outline-variant/50">
        {threadList.map((thread) => {
          const isExpanded = expandedThreadId === thread.threadId;
          const latest = thread.messages[thread.messages.length - 1];
          const contactName = thread.contactId ? contactMap[thread.contactId] : null;
          const isUnread = tabCtx === "inbox" && thread.messages.some((m) => !m.is_read && m.direction === "inbound");
          const threadFUs = followUpsByThread[thread.threadId] || [];
          const pendingFUCount = threadFUs.reduce((sum, fu) => sum + fu.email_follow_up_messages.filter((m) => m.status === "pending").length, 0);
          const isSingle = thread.messages.length === 1;

          return (
            <div key={thread.threadId} className={isExpanded ? "bg-surface-container-low/30" : ""}>
              {/* Thread row */}
              <button
                type="button"
                className={`group/thread w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors cursor-pointer ${isUnread ? "bg-primary/[0.04]" : ""}`}
                onClick={() => handleThreadClick(thread)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    tabCtx === "trash" ? "bg-surface-container-low" :
                    tabCtx === "hidden" ? "bg-surface-container-low" :
                    latest.direction === "outbound" ? "bg-primary-container" : "bg-tertiary-container"
                  }`}>
                    {tabCtx === "trash" ? <Trash2 className="h-3.5 w-3.5 text-muted-foreground" /> :
                     tabCtx === "hidden" ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> :
                     latest.direction === "outbound" ? <ArrowUpRight className="h-3.5 w-3.5 text-on-primary-container" /> :
                     <ArrowDownLeft className="h-3.5 w-3.5 text-on-tertiary-container" />}
                  </div>
                  <div className="w-36 shrink-0 truncate">
                    <span className={`text-sm ${isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
                      {contactName || (latest.direction === "outbound" ? `To: ${latest.to_addresses?.[0] || "Unknown"}` : latest.from_address || "Unknown")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>{thread.subject}</span>
                    {thread.messages.length > 1 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-secondary-container text-[10px] font-medium text-on-secondary-container shrink-0">{thread.messages.length}</span>
                    )}
                    {pendingFUCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded-full bg-tertiary-container/50 text-[10px] font-medium text-on-tertiary-container shrink-0">
                        <Clock className="h-2.5 w-2.5" />{pendingFUCount}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {latest.snippet || ""}</span>
                  </div>
                  <span className={`text-xs shrink-0 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {thread.latestDate ? formatDate(thread.latestDate) : ""}
                  </span>
                </div>
              </button>

              {/* Expanded view */}
              {isExpanded && (
                <div className="px-4 pb-3">
                  {isSingle ? (
                    /* Single message: content shown directly */
                    <div className="ml-4 pl-4 pt-1">
                      {renderExpandedContent(thread.messages[0], thread, contactName, tabCtx)}
                    </div>
                  ) : (
                    /* Multi-message thread */
                    <div className="ml-4 border-l-2 border-outline-variant/50 pl-4 space-y-1.5 pt-1">
                      {thread.messages.map((msg) => {
                        const isMsgExpanded = expandedEmailId === msg.gmail_message_id;
                        return (
                          <div key={msg.gmail_message_id} className="rounded-lg border border-outline-variant/40 overflow-hidden">
                            {/* Message header row */}
                            <div className="group/msg flex items-center gap-2 p-2.5 hover:bg-surface-container-low/80 transition-colors cursor-pointer" onClick={() => handleExpandEmail(msg.gmail_message_id)}>
                              {msg.direction === "outbound" ? (
                                <ArrowUpRight className="h-3 w-3 shrink-0 text-primary" />
                              ) : (
                                <ArrowDownLeft className="h-3 w-3 shrink-0 text-tertiary" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium truncate ${!msg.is_read && msg.direction === "inbound" ? "text-foreground font-semibold" : "text-foreground"}`}>
                                    {msg.direction === "outbound" ? "You" : (contactName || msg.from_address || "Unknown")}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground shrink-0">{msg.date ? formatDateFull(msg.date) : ""}</span>
                                </div>
                                {!isMsgExpanded && <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.snippet || ""}</p>}
                              </div>
                              {!isMsgExpanded && renderMsgRowActions(msg, tabCtx)}
                            </div>

                            {/* Expanded message content */}
                            {isMsgExpanded && (
                              <div className="px-2.5 pb-2.5">
                                {renderExpandedContent(msg, thread, contactName, tabCtx)}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Quick reply at thread bottom */}
                      {tabCtx !== "trash" && tabCtx !== "hidden" && (
                        <div className="pl-2 pt-1 pb-1 flex items-center gap-4">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors"
                            onClick={() => {
                              const lastMsg = thread.messages[thread.messages.length - 1];
                              const replyTo = lastMsg.direction === "outbound" ? (lastMsg.to_addresses?.[0] || "") : (lastMsg.from_address || "");
                              const subj = thread.subject.replace(/^(Re:\s*)+/i, "");
                              openCompose({ to: replyTo, name: contactName || undefined, subject: `Re: ${subj}`, threadId: thread.threadId });
                            }}
                          >
                            <Reply className="h-3.5 w-3.5" />
                            Reply
                          </button>
                          {thread.contactId && (
                            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push(`/contacts/${thread.contactId}`)}>
                              View contact
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Sidebar items ──

  const sidebarItems: { key: SidebarTab; label: string; icon: typeof Inbox; count: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: unreadEmailCount },
    { key: "sent", label: "Sent", icon: Send, count: sentCount },
    { key: "scheduled", label: "Scheduled", icon: Clock, count: scheduledEmails.length },
    { key: "followups", label: "Follow-ups", icon: Clock, count: pendingFollowUpCount },
    { key: "trash", label: "Trash", icon: Trash2, count: trashedEmails.length },
    { key: "hidden", label: "Hidden", icon: EyeOff, count: hiddenEmails.length },
  ];

  const switchTab = (key: SidebarTab) => {
    setActiveTab(key);
    setExpandedThreadId(null);
    setExpandedEmailId(null);
    setExpandedEmailContent(null);
    setMoveDropdownMsgId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low text-foreground rounded-full border border-outline-variant placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-sm"
            />
          </div>

          {/* Contact filter */}
          {contactsInEmails.length > 0 && (
            <div className="relative" ref={contactFilterRef}>
              <button
                type="button"
                onClick={() => setContactFilterOpen(!contactFilterOpen)}
                className={`h-10 px-3 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer border ${
                  selectedContactId !== null
                    ? "bg-primary-container text-on-primary-container border-primary/30"
                    : "bg-surface-container-low text-muted-foreground border-outline-variant hover:text-foreground"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                {selectedContactId !== null ? (
                  <>
                    <span className="max-w-24 truncate">{contactMap[selectedContactId]}</span>
                    <button
                      type="button"
                      className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setSelectedContactId(null); setContactFilterOpen(false); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <span className="hidden sm:inline">Contact</span>
                )}
              </button>
              {contactFilterOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 max-h-64 overflow-y-auto bg-surface-container-high rounded-xl shadow-lg border border-outline-variant py-1">
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${selectedContactId === null ? "text-primary bg-primary/[0.06]" : "text-foreground hover:bg-surface-container-low"}`}
                    onClick={() => { setSelectedContactId(null); setContactFilterOpen(false); }}
                  >
                    All contacts
                  </button>
                  {contactsInEmails.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${selectedContactId === c.id ? "text-primary bg-primary/[0.06] font-medium" : "text-foreground hover:bg-surface-container-low"}`}
                      onClick={() => { setSelectedContactId(c.id); setContactFilterOpen(false); }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
            title="Sync emails"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => openCompose()} size="sm">
            <PenSquare className="h-4 w-4 mr-1.5" />
            Compose
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 shrink-0 hidden md:block">
            <nav className="space-y-0.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                const isBadge = item.key === "inbox" && item.count > 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => switchTab(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                      isActive ? "bg-secondary-container text-on-secondary-container" : "text-muted-foreground hover:text-foreground hover:bg-surface-container-low"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count > 0 && (
                      <span className={`text-xs font-medium ${
                        isBadge ? "bg-destructive text-destructive-foreground rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" : isActive ? "text-on-secondary-container" : "text-muted-foreground"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile tabs */}
            <div className="flex md:hidden gap-1 border-b border-outline-variant mb-4 overflow-x-auto">
              {sidebarItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => switchTab(item.key)}
                  className={`px-3 py-2.5 text-sm font-medium transition-colors relative cursor-pointer whitespace-nowrap ${
                    activeTab === item.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {item.count > 0 && ` (${item.count})`}
                  {activeTab === item.key && <div className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-primary" />}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 text-muted-foreground py-16">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="text-sm">Loading inbox…</span>
              </div>
            ) : (
              <>
                {activeTab === "inbox" && renderThreadList(filteredInboxThreads, "inbox")}
                {activeTab === "sent" && renderThreadList(filteredSentThreads, "sent")}
                {activeTab === "trash" && renderThreadList(filteredTrashThreads, "trash")}
                {activeTab === "hidden" && renderThreadList(filteredHiddenThreads, "hidden")}

                {/* ─── SCHEDULED TAB ─── */}
                {activeTab === "scheduled" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-medium text-foreground">
                        Scheduled emails
                        {scheduledEmails.length > 0 && <span className="ml-1.5 text-muted-foreground font-normal">({scheduledEmails.length})</span>}
                      </h2>
                    </div>
                    {scheduledEmails.length === 0 ? (
                      <div className="text-center py-16">
                        <Send className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No scheduled emails.</p>
                        <p className="text-xs text-muted-foreground mt-1">Use the "Schedule" option in Compose to queue emails for later.</p>
                      </div>
                    ) : (
                      <div className="border border-outline-variant/50 rounded-xl overflow-hidden divide-y divide-outline-variant/50">
                        {scheduledEmails.map((se) => {
                          const contactName = se.matched_contact_id ? contactMap[se.matched_contact_id] : null;
                          const linkedFU = followUps.find((fu) => fu.scheduled_email_id === se.id);
                          return (
                            <div key={se.id} className="px-4 py-3 hover:bg-surface-container-low/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                                  <Clock className="h-3.5 w-3.5 text-on-tertiary-container" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{se.subject}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tertiary-container/50 text-on-tertiary-container shrink-0">Scheduled</span>
                                    {linkedFU && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tertiary-container/30 text-on-tertiary-container shrink-0">
                                        + {linkedFU.email_follow_up_messages.filter((m) => m.status === "pending").length} follow-up(s)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground truncate">To: {contactName || se.recipient_email}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className="text-xs text-muted-foreground shrink-0">Sends {formatDateFull(se.scheduled_send_at)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => { setFollowUpModal({ recipientEmail: se.recipient_email, contactName: se.contact_name, originalSubject: se.subject, originalSentAt: se.scheduled_send_at, originalGmailMessageId: `scheduled_${se.id}`, threadId: se.thread_id || `pending_scheduled_${se.id}`, scheduledEmailId: se.id, existingFollowUp: linkedFU || null }); }} className="p-1.5 rounded-full text-muted-foreground hover:text-tertiary cursor-pointer transition-colors" title="Schedule follow-up">
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => cancelScheduledEmail(se.id)} className="p-1.5 rounded-full text-muted-foreground hover:text-destructive cursor-pointer transition-colors" title="Cancel scheduled email">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── FOLLOW-UPS TAB ─── */}
                {activeTab === "followups" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-medium text-foreground">
                        Active follow-ups
                        {followUps.length > 0 && <span className="ml-1.5 text-muted-foreground font-normal">({followUps.length} sequence{followUps.length !== 1 ? "s" : ""})</span>}
                      </h2>
                    </div>
                    {followUps.length === 0 ? (
                      <div className="text-center py-16">
                        <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No active follow-ups.</p>
                        <p className="text-xs text-muted-foreground mt-1">Schedule follow-ups from sent emails to automate reminders.</p>
                      </div>
                    ) : (
                      <div className="border border-outline-variant/50 rounded-xl overflow-hidden divide-y divide-outline-variant/50">
                        {followUps.map((fu) => {
                          const pendingMsgs = fu.email_follow_up_messages.filter((m) => m.status === "pending").sort((a, b) => a.sequence_number - b.sequence_number);
                          const nextMsg = pendingMsgs[0];
                          return (
                            <div key={fu.id} className="px-4 py-3 hover:bg-surface-container-low/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-tertiary-container/50 flex items-center justify-center shrink-0">
                                  <Clock className="h-3.5 w-3.5 text-on-tertiary-container" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{fu.original_subject || "(no subject)"}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tertiary-container/50 text-on-tertiary-container shrink-0">{pendingMsgs.length} pending</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground truncate">To: {fu.contact_name || fu.recipient_email}</span>
                                    {nextMsg && (
                                      <>
                                        <span className="text-xs text-muted-foreground">·</span>
                                        <span className="text-xs text-muted-foreground shrink-0">Next: {formatDateFull(nextMsg.scheduled_send_at)}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {fu.email_follow_up_messages.sort((a, b) => a.sequence_number - b.sequence_number).map((m) => (
                                      <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.status === "sent" ? "bg-primary/15 text-primary" : m.status === "cancelled" ? "bg-surface-container-low text-muted-foreground line-through" : "bg-tertiary-container/50 text-on-tertiary-container"}`}>
                                        #{m.sequence_number}: Day {m.send_after_days}
                                        {m.status === "sent" && " (sent)"}
                                        {m.status === "cancelled" && " (cancelled)"}
                                        {m.status === "pending" && ` (${new Date(m.scheduled_send_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">Auto-cancels if they reply</p>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button type="button" onClick={() => { setFollowUpModal({ recipientEmail: fu.recipient_email, contactName: fu.contact_name, originalSubject: fu.original_subject || "", originalSentAt: fu.original_sent_at, originalGmailMessageId: fu.original_gmail_message_id, threadId: fu.thread_id, existingFollowUp: fu }); }} className="p-1.5 rounded-full text-muted-foreground hover:text-primary cursor-pointer transition-colors" title="Edit follow-ups">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => cancelFollowUp(fu.id)} className="p-1.5 rounded-full text-muted-foreground hover:text-destructive cursor-pointer transition-colors" title="Cancel all follow-ups">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <FollowUpModal
        isOpen={!!followUpModal}
        onClose={() => { setFollowUpModal(null); loadInbox(); }}
        recipientEmail={followUpModal?.recipientEmail || ""}
        contactName={followUpModal?.contactName || null}
        originalSubject={followUpModal?.originalSubject || ""}
        originalSentAt={followUpModal?.originalSentAt || new Date().toISOString()}
        originalGmailMessageId={followUpModal?.originalGmailMessageId || ""}
        threadId={followUpModal?.threadId || ""}
        scheduledEmailId={followUpModal?.scheduledEmailId}
        existingFollowUp={followUpModal?.existingFollowUp}
      />
    </div>
  );
}
