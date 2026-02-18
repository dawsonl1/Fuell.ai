"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getGmailConnection } from "@/lib/queries";
import type { GmailConnection } from "@/lib/types";

type ComposeOptions = {
  to?: string;
  name?: string;
  subject?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  quotedHtml?: string;
};

type ComposeContextValue = {
  isOpen: boolean;
  prefillTo: string;
  prefillName: string;
  prefillSubject: string;
  replyThreadId: string;
  replyInReplyTo: string;
  replyReferences: string;
  replyQuotedHtml: string;
  gmailConnected: boolean;
  gmailAddress: string;
  openCompose: (opts?: ComposeOptions) => void;
  closeCompose: () => void;
};

const ComposeContext = createContext<ComposeContextValue>({
  isOpen: false,
  prefillTo: "",
  prefillName: "",
  prefillSubject: "",
  replyThreadId: "",
  replyInReplyTo: "",
  replyReferences: "",
  replyQuotedHtml: "",
  gmailConnected: false,
  gmailAddress: "",
  openCompose: () => {},
  closeCompose: () => {},
});

export function useCompose() {
  return useContext(ComposeContext);
}

export function ComposeEmailProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [gmailConn, setGmailConn] = useState<GmailConnection | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [prefillTo, setPrefillTo] = useState("");
  const [prefillName, setPrefillName] = useState("");
  const [prefillSubject, setPrefillSubject] = useState("");
  const [replyThreadId, setReplyThreadId] = useState("");
  const [replyInReplyTo, setReplyInReplyTo] = useState("");
  const [replyReferences, setReplyReferences] = useState("");
  const [replyQuotedHtml, setReplyQuotedHtml] = useState("");

  useEffect(() => {
    if (!user) return;
    getGmailConnection(user.id)
      .then((conn) => setGmailConn(conn as GmailConnection | null))
      .catch(() => {});
  }, [user]);

  const openCompose = useCallback((opts?: ComposeOptions) => {
    setPrefillTo(opts?.to || "");
    setPrefillName(opts?.name || "");
    setPrefillSubject(opts?.subject || "");
    setReplyThreadId(opts?.threadId || "");
    setReplyInReplyTo(opts?.inReplyTo || "");
    setReplyReferences(opts?.references || "");
    setReplyQuotedHtml(opts?.quotedHtml || "");
    setIsOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsOpen(false);
    setPrefillTo("");
    setPrefillName("");
    setPrefillSubject("");
    setReplyThreadId("");
    setReplyInReplyTo("");
    setReplyReferences("");
    setReplyQuotedHtml("");
  }, []);

  return (
    <ComposeContext.Provider
      value={{
        isOpen,
        prefillTo,
        prefillName,
        prefillSubject,
        replyThreadId,
        replyInReplyTo,
        replyReferences,
        replyQuotedHtml,
        gmailConnected: !!gmailConn,
        gmailAddress: gmailConn?.gmail_address || "",
        openCompose,
        closeCompose,
      }}
    >
      {children}
    </ComposeContext.Provider>
  );
}
