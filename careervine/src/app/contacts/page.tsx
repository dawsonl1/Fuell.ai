/**
 * Contacts page — M3 styled CRUD interface
 *
 * This is the largest page in the app (~1400 lines). It provides:
 *   - Contact list with search and tag filtering
 *   - Expandable contact cards showing activity timeline, pending/completed actions
 *   - Modal form for creating/editing contacts (name, status, company, school,
 *     emails, phones, tags, follow-up frequency, preferred contact method)
 *   - Inline action item editing with description, contacts, and due date
 *   - Interaction create/edit modal (scoped to the selected contact)
 *   - Meeting detail modal with edit mode
 *
 * Key state:
 *   - contacts / selectedContact / editingContact
 *   - contactMeetings / contactInteractions / contactActions
 *   - showForm / showActionModal / showInteractionModal
 *
 * Data flow:
 *   loadContacts() → getContacts(userId)
 *   Expanding a contact → getMeetingsForContact + getInteractions + getActionItemsForContact
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContacts, createContact, updateContact, deleteContact, getMeetingsForContact, createActionItem, findOrCreateSchool, addSchoolToContact, removeSchoolsFromContact, findOrCreateCompany, addCompanyToContact, removeCompaniesFromContact, updateMeeting, getActionItemsForContact, getCompletedActionItemsForContact, updateActionItem, deleteActionItem, removeEmailsFromContact, addEmailToContact, removePhonesFromContact, addPhoneToContact, getTags, createTag, addTagToContact, removeTagFromContact, getInteractions, createInteraction, updateInteraction, deleteInteraction, replaceContactsForActionItem, uploadAttachment, addAttachmentToContact, getAttachmentsForContact, getAttachmentUrl, deleteAttachment } from "@/lib/queries";
import type { Contact, ContactMeeting, InteractionRow, TagRow } from "@/lib/types";
import { Plus, Pencil, Trash2, ExternalLink, Users, X, Calendar, ChevronRight, CheckSquare, GraduationCap, Briefcase, Check, ChevronDown, Mail, Phone, Tag, MessageSquare, Paperclip, Download } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SchoolAutocomplete } from "@/components/ui/school-autocomplete";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { DegreeAutocomplete } from "@/components/ui/degree-autocomplete";
import { ContactPicker } from "@/components/ui/contact-picker";

type CompanyEntry = { company_name: string; title: string; is_current: boolean };

const emptyForm = {
  name: "",
  industry: "",
  linkedin_url: "",
  notes: "",
  met_through: "",
  follow_up_frequency_days: "",
  contact_status: "",
  expected_graduation: "",
  school_name: "",
  degree: "",
  field_of_study: "",
};

const FOLLOW_UP_OPTIONS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "Custom", days: -1 },
];

const inputClasses =
  "w-full h-14 px-4 bg-surface-container-low text-foreground rounded-[4px] border border-outline placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-sm";

const labelClasses = "block text-xs font-medium text-muted-foreground mb-1.5";

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactMeetings, setContactMeetings] = useState<ContactMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ContactMeeting | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionContactId, setActionContactId] = useState<number | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [actionMeetingId, setActionMeetingId] = useState<number | null>(null);
  const [showCustomFrequency, setShowCustomFrequency] = useState(false);
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [showEducation, setShowEducation] = useState(false);
  const [contactActions, setContactActions] = useState<{ id: number; title: string; description: string | null; due_at: string | null; is_completed: boolean; meetings: { id: number; meeting_type: string; meeting_date: string } | null; action_item_contacts?: { contact_id: number; contacts: { id: number; name: string } | null }[] }[]>([]);
  const [contactCompletedActions, setContactCompletedActions] = useState<{ id: number; title: string; due_at: string | null; is_completed: boolean; completed_at: string | null; meetings: { id: number; meeting_type: string; meeting_date: string } | null }[]>([]);
  const [showContactCompleted, setShowContactCompleted] = useState(false);
  const [editingContactActionId, setEditingContactActionId] = useState<number | null>(null);
  const [editCATitle, setEditCATitle] = useState("");
  const [editCADescription, setEditCADescription] = useState("");
  const [editCADueDate, setEditCADueDate] = useState("");
  const [editCAContactIds, setEditCAContactIds] = useState<number[]>([]);
  const [editingMeetingMode, setEditingMeetingMode] = useState(false);
  const [meetingEditNotes, setMeetingEditNotes] = useState("");
  const [meetingEditTranscript, setMeetingEditTranscript] = useState("");
  const [meetingSaving, setMeetingSaving] = useState(false);

  // Emails & phones form state
  type EmailEntry = { email: string; is_primary: boolean };
  type PhoneEntry = { phone: string; type: string; is_primary: boolean };
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [preferredContactKey, setPreferredContactKey] = useState("");

  // Tags form state
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Interactions in contact view
  const [contactInteractions, setContactInteractions] = useState<InteractionRow[]>([]);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<InteractionRow | null>(null);
  const [interactionForm, setInteractionForm] = useState({ interaction_date: "", interaction_type: "", summary: "" });

  // Attachments in contact view
  const [contactAttachments, setContactAttachments] = useState<{ id: number; file_name: string; content_type: string | null; file_size_bytes: number | null; object_path: string; created_at: string | null }[]>([]);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    if (!user) return;
    try { setAllTags(await getTags(user.id)); } catch {}
  };

  const loadContacts = async () => {
    if (!user) return;
    try {
      const data = await getContacts(user.id);
      setContacts(data as Contact[]);
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const contactData = {
        user_id: user.id,
        name: formData.name,
        industry: formData.industry || null,
        linkedin_url: formData.linkedin_url || null,
        notes: formData.notes || null,
        met_through: formData.met_through || null,
        follow_up_frequency_days: formData.follow_up_frequency_days ? parseInt(formData.follow_up_frequency_days) : null,
        preferred_contact_method: (() => {
          if (!preferredContactKey) return null;
          const [type, idxStr] = preferredContactKey.split("-");
          const idx = parseInt(idxStr);
          if (type === "email" && emails[idx]?.email) return "email";
          if (type === "phone" && phones[idx]?.phone) return "phone";
          return null;
        })(),
        preferred_contact_value: (() => {
          if (!preferredContactKey) return null;
          const [type, idxStr] = preferredContactKey.split("-");
          const idx = parseInt(idxStr);
          if (type === "email") return emails[idx]?.email || null;
          if (type === "phone") return phones[idx]?.phone || null;
          return null;
        })(),
        contact_status: formData.contact_status || null,
        expected_graduation: formData.contact_status === "student" ? (formData.expected_graduation || null) : null,
      };
      let contactId: number;
      if (editingContact) {
        await updateContact(editingContact.id, contactData);
        contactId = editingContact.id;
      } else {
        const created = await createContact(contactData);
        contactId = created.id;
      }
      // Save companies
      if (editingContact) {
        await removeCompaniesFromContact(contactId);
      }
      for (const entry of companies) {
        if (entry.company_name.trim()) {
          const company = await findOrCreateCompany(entry.company_name.trim());
          await addCompanyToContact({
            contact_id: contactId,
            company_id: company.id,
            title: entry.title || null,
            is_current: entry.is_current,
            start_date: null,
            end_date: null,
          });
        }
      }
      // Save school info
      if (formData.school_name.trim()) {
        if (editingContact) {
          await removeSchoolsFromContact(contactId);
        }
        const school = await findOrCreateSchool(formData.school_name.trim());
        await addSchoolToContact({
          contact_id: contactId,
          school_id: school.id,
          degree: formData.degree || null,
          field_of_study: formData.field_of_study || null,
          start_year: null,
          end_year: null,
        });
      } else if (editingContact) {
        await removeSchoolsFromContact(contactId);
      }
      // Save emails (delete-all-reinsert)
      await removeEmailsFromContact(contactId);
      for (const entry of emails) {
        if (entry.email.trim()) {
          await addEmailToContact(contactId, entry.email.trim(), entry.is_primary);
        }
      }
      // Save phones (delete-all-reinsert)
      await removePhonesFromContact(contactId);
      for (const entry of phones) {
        if (entry.phone.trim()) {
          await addPhoneToContact(contactId, entry.phone.trim(), entry.type || "mobile", entry.is_primary);
        }
      }
      // Save tags (diff-based)
      if (editingContact) {
        const oldTagIds = editingContact.contact_tags.map((ct) => ct.tag_id);
        const toAdd = selectedTagIds.filter((id) => !oldTagIds.includes(id));
        const toRemove = oldTagIds.filter((id) => !selectedTagIds.includes(id));
        for (const tagId of toAdd) await addTagToContact(contactId, tagId);
        for (const tagId of toRemove) await removeTagFromContact(contactId, tagId);
      } else {
        for (const tagId of selectedTagIds) await addTagToContact(contactId, tagId);
      }
      await loadContacts();
      closeForm();
    } catch (error) {
      console.error("Error saving contact:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await deleteContact(id);
      await loadContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    const schoolInfo = contact.contact_schools?.[0];
    setFormData({
      name: contact.name,
      industry: contact.industry || "",
      linkedin_url: contact.linkedin_url || "",
      notes: contact.notes || "",
      met_through: contact.met_through || "",
      follow_up_frequency_days: contact.follow_up_frequency_days?.toString() || "",
      contact_status: contact.contact_status || "",
      expected_graduation: contact.expected_graduation || "",
      school_name: schoolInfo?.schools?.name || "",
      degree: schoolInfo?.degree || "",
      field_of_study: schoolInfo?.field_of_study || "",
    });
    // Populate companies
    setCompanies(
      contact.contact_companies.length > 0
        ? contact.contact_companies.map((cc) => ({
            company_name: cc.companies.name,
            title: cc.title || "",
            is_current: cc.is_current,
          }))
        : []
    );
    // Populate emails
    setEmails(
      contact.contact_emails.length > 0
        ? contact.contact_emails.map((e) => ({ email: e.email || "", is_primary: e.is_primary }))
        : []
    );
    // Populate phones
    setPhones(
      contact.contact_phones.length > 0
        ? contact.contact_phones.map((p) => ({ phone: p.phone, type: p.type, is_primary: p.is_primary }))
        : []
    );
    // Derive preferred contact key
    if (contact.preferred_contact_method && contact.preferred_contact_value) {
      if (contact.preferred_contact_method === "email") {
        const idx = contact.contact_emails.findIndex((e) => e.email === contact.preferred_contact_value);
        setPreferredContactKey(idx >= 0 ? `email-${idx}` : "");
      } else if (contact.preferred_contact_method === "phone") {
        const idx = contact.contact_phones.findIndex((p) => p.phone === contact.preferred_contact_value);
        setPreferredContactKey(idx >= 0 ? `phone-${idx}` : "");
      } else {
        setPreferredContactKey("");
      }
    } else {
      setPreferredContactKey("");
    }
    // Populate tags
    setSelectedTagIds(contact.contact_tags.map((ct) => ct.tag_id));
    // Show education if contact has school data
    setShowEducation(!!schoolInfo);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData(emptyForm);
    setCompanies([]);
    setEmails([]);
    setPhones([]);
    setSelectedTagIds([]);
    setTagSearch("");
    setPreferredContactKey("");
    setShowEducation(false);
  };

  const reloadContactActions = async (contactId: number) => {
    try {
      const [actions, completedActions] = await Promise.all([
        getActionItemsForContact(contactId),
        getCompletedActionItemsForContact(contactId),
      ]);
      setContactActions(actions as typeof contactActions);
      setContactCompletedActions(completedActions as typeof contactCompletedActions);
    } catch {}
  };

  const handleSelectContact = async (contact: Contact) => {
    if (selectedContact?.id === contact.id) {
      setSelectedContact(null);
      return;
    }
    setSelectedContact(contact);
    setLoadingMeetings(true);
    try {
      const [meetings, actions, completedActions, interactions, attachments] = await Promise.all([
        getMeetingsForContact(contact.id),
        getActionItemsForContact(contact.id),
        getCompletedActionItemsForContact(contact.id),
        getInteractions(contact.id),
        getAttachmentsForContact(contact.id),
      ]);
      setContactMeetings(meetings);
      setContactActions(actions as typeof contactActions);
      setContactCompletedActions(completedActions as typeof contactCompletedActions);
      setContactInteractions(interactions);
      setContactAttachments(attachments as typeof contactAttachments);
    } catch (e) {
      console.error("Error loading data for contact:", e);
      setContactMeetings([]);
      setContactActions([]);
      setContactCompletedActions([]);
      setContactInteractions([]);
      setContactAttachments([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedContact || !e.target.files?.length) return;
    setAttachmentUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const attachment = await uploadAttachment(user.id, file);
        await addAttachmentToContact(selectedContact.id, attachment.id);
      }
      setContactAttachments(await getAttachmentsForContact(selectedContact.id) as typeof contactAttachments);
    } catch (err) {
      console.error("Error uploading attachment:", err);
    } finally {
      setAttachmentUploading(false);
      e.target.value = "";
    }
  };

  const handleAttachmentDownload = async (objectPath: string, fileName: string) => {
    try {
      const url = await getAttachmentUrl(objectPath);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading attachment:", err);
    }
  };

  const handleAttachmentDelete = async (attachmentId: number, objectPath: string) => {
    if (!selectedContact) return;
    try {
      await deleteAttachment(attachmentId, objectPath);
      setContactAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error("Error deleting attachment:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-sm">Loading contacts…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {contacts.length} {contacts.length === 1 ? "person" : "people"} in your network
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-[18px] w-[18px]" /> Add contact
          </Button>
        </div>

        {/* Modal form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/32" />
            <div className="relative w-full max-w-2xl bg-surface-container-high rounded-[28px] shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-[22px] leading-7 font-normal text-foreground">
                  {editingContact ? "Edit contact" : "New contact"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

                {/* ── Basics ── */}
                <div>
                  <label className={labelClasses}>Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Status</label>
                    <div className="inline-flex rounded-full border border-outline overflow-hidden">
                      {[
                        { value: "student", label: "Student" },
                        { value: "professional", label: "Professional" },
                      ].map((opt, idx) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const newStatus = formData.contact_status === opt.value ? "" : opt.value;
                            setFormData({ ...formData, contact_status: newStatus });
                            if (opt.value === "student" && newStatus === "student") {
                              setShowEducation(true);
                            } else if (newStatus !== "student") {
                              const hasEducationData = formData.school_name.trim() || formData.degree.trim() || formData.field_of_study.trim();
                              if (!hasEducationData) {
                                setShowEducation(false);
                              }
                            }
                          }}
                          className={`flex-1 h-10 px-4 text-sm font-medium cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 ${
                            idx > 0 ? "border-l border-outline" : ""
                          } ${
                            formData.contact_status === opt.value
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-transparent text-foreground hover:bg-surface-container"
                          }`}
                        >
                          {formData.contact_status === opt.value && <Check className="h-4 w-4" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Industry</label>
                    <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className={inputClasses} placeholder="e.g. Technology" />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Met at</label>
                  <input type="text" value={formData.met_through} onChange={(e) => setFormData({ ...formData, met_through: e.target.value })} className={inputClasses} placeholder="e.g. Conference, mutual friend" />
                </div>

                {/* ── Work & Education ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={`${labelClasses} flex items-center gap-1.5 mb-3`}>
                    <Briefcase className="h-3.5 w-3.5" /> Work experience
                  </label>
                  {companies.map((entry, i) => (
                    <div key={i} className="mb-3 p-3 rounded-[12px] bg-surface-container-low space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {(["current", "past"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                const updated = [...companies];
                                updated[i] = { ...updated[i], is_current: type === "current" };
                                setCompanies(updated);
                              }}
                              className={`h-8 px-3 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                                (type === "current" ? entry.is_current : !entry.is_current)
                                  ? "bg-secondary-container text-on-secondary-container border-secondary-container"
                                  : "bg-transparent text-foreground border-outline-variant hover:bg-surface-container"
                              }`}
                            >
                              {type === "current" ? "Current" : "Past"}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => setCompanies(companies.filter((_, j) => j !== i))} className="p-1 rounded-full text-muted-foreground hover:text-destructive cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={entry.company_name}
                          onChange={(e) => { const u = [...companies]; u[i] = { ...u[i], company_name: e.target.value }; setCompanies(u); }}
                          className={`${inputClasses} !h-11`}
                          placeholder="Company name"
                        />
                        <input
                          type="text"
                          value={entry.title}
                          onChange={(e) => { const u = [...companies]; u[i] = { ...u[i], title: e.target.value }; setCompanies(u); }}
                          className={`${inputClasses} !h-11`}
                          placeholder="Job title"
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="tonal" size="sm" onClick={() => setCompanies([...companies, { company_name: "", title: "", is_current: true }])}>
                    <Plus className="h-4 w-4" /> Add company
                  </Button>
                </div>

                <div className="pt-2 border-t border-outline-variant">
                  {(showEducation || formData.contact_status === "student") ? (
                    <>
                      <label className={`${labelClasses} flex items-center gap-1.5 mb-3`}>
                        <GraduationCap className="h-3.5 w-3.5" /> Education
                      </label>
                      <div className="space-y-3">
                        <div>
                          <label className={labelClasses}>School</label>
                          <SchoolAutocomplete value={formData.school_name} onChange={(val) => setFormData({ ...formData, school_name: val })} className={inputClasses} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClasses}>Degree</label>
                            <DegreeAutocomplete value={formData.degree} onChange={(val) => setFormData({ ...formData, degree: val })} className={inputClasses} />
                          </div>
                          <div>
                            <label className={labelClasses}>Field of study</label>
                            <input type="text" value={formData.field_of_study} onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })} className={inputClasses} placeholder="e.g. Computer Science" />
                          </div>
                        </div>
                        {formData.contact_status === "student" && (
                          <div>
                            <label className={labelClasses}>Expected graduation</label>
                            <MonthYearPicker value={formData.expected_graduation} onChange={(val) => setFormData({ ...formData, expected_graduation: val })} placeholder="Select graduation month" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <Button type="button" variant="tonal" size="sm" onClick={() => setShowEducation(true)}>
                      <GraduationCap className="h-4 w-4" /> Add education
                    </Button>
                  )}
                </div>

                {/* ── Emails ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={`${labelClasses} flex items-center gap-1.5 mb-3`}>
                    <Mail className="h-3.5 w-3.5" /> Emails
                  </label>
                  {emails.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="email"
                        value={entry.email}
                        onChange={(e) => { const u = [...emails]; u[i] = { ...u[i], email: e.target.value }; setEmails(u); }}
                        className={`${inputClasses} !h-11 flex-1`}
                        placeholder="email@example.com"
                      />
                      <Checkbox
                        checked={preferredContactKey === `email-${i}`}
                        onChange={(checked) => setPreferredContactKey(checked ? `email-${i}` : "")}
                        label="Preferred"
                      />
                      <button type="button" onClick={() => {
                        if (preferredContactKey === `email-${i}`) setPreferredContactKey("");
                        else if (preferredContactKey.startsWith("email-")) {
                          const oldIdx = parseInt(preferredContactKey.split("-")[1]);
                          if (oldIdx > i) setPreferredContactKey(`email-${oldIdx - 1}`);
                        }
                        setEmails(emails.filter((_, j) => j !== i));
                      }} className="p-1 rounded-full text-muted-foreground hover:text-destructive cursor-pointer shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="tonal" size="sm" onClick={() => setEmails([...emails, { email: "", is_primary: emails.length === 0 }])}>
                    <Plus className="h-4 w-4" /> Add email
                  </Button>
                </div>

                {/* ── Phones ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={`${labelClasses} flex items-center gap-1.5 mb-3`}>
                    <Phone className="h-3.5 w-3.5" /> Phones
                  </label>
                  {phones.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="tel"
                        value={entry.phone}
                        onChange={(e) => { const u = [...phones]; u[i] = { ...u[i], phone: e.target.value }; setPhones(u); }}
                        className={`${inputClasses} !h-11 flex-1`}
                        placeholder="555-123-4567"
                      />
                      <div className="shrink-0 w-[100px]">
                        <Select
                          value={entry.type}
                          onChange={(val) => { const u = [...phones]; u[i] = { ...u[i], type: val }; setPhones(u); }}
                          options={[
                            { value: "mobile", label: "Mobile" },
                            { value: "work", label: "Work" },
                            { value: "home", label: "Home" },
                          ]}
                        />
                      </div>
                      <Checkbox
                        checked={preferredContactKey === `phone-${i}`}
                        onChange={(checked) => setPreferredContactKey(checked ? `phone-${i}` : "")}
                        label="Preferred"
                      />
                      <button type="button" onClick={() => {
                        if (preferredContactKey === `phone-${i}`) setPreferredContactKey("");
                        else if (preferredContactKey.startsWith("phone-")) {
                          const oldIdx = parseInt(preferredContactKey.split("-")[1]);
                          if (oldIdx > i) setPreferredContactKey(`phone-${oldIdx - 1}`);
                        }
                        setPhones(phones.filter((_, j) => j !== i));
                      }} className="p-1 rounded-full text-muted-foreground hover:text-destructive cursor-pointer shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="tonal" size="sm" onClick={() => setPhones([...phones, { phone: "", type: "mobile", is_primary: phones.length === 0 }])}>
                    <Plus className="h-4 w-4" /> Add phone
                  </Button>
                </div>

                {/* ── Tags ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={`${labelClasses} flex items-center gap-1.5 mb-3`}>
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </label>
                  {selectedTagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {selectedTagIds.map((tagId) => {
                        const tag = allTags.find((t) => t.id === tagId);
                        return tag ? (
                          <span key={tagId} className="inline-flex items-center gap-1 h-7 pl-3 pr-1.5 rounded-full bg-secondary-container text-xs text-on-secondary-container font-medium">
                            {tag.name}
                            <button type="button" onClick={() => setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId))} className="p-0.5 rounded-full hover:bg-on-secondary-container/10 cursor-pointer">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={(e) => { setTagSearch(e.target.value); setShowTagDropdown(true); }}
                      onFocus={() => setShowTagDropdown(true)}
                      className={`${inputClasses} !h-11`}
                      placeholder="Search or create tags…"
                    />
                    {showTagDropdown && tagSearch.trim() && (
                      <div className="absolute z-50 mt-1 w-full bg-white rounded-[12px] border border-outline-variant shadow-lg max-h-48 overflow-y-auto py-1">
                        {allTags
                          .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTagIds.includes(t.id))
                          .map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => { setSelectedTagIds([...selectedTagIds, tag.id]); setTagSearch(""); setShowTagDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-container cursor-pointer"
                            >
                              {tag.name}
                            </button>
                          ))}
                        {!allTags.some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!user) return;
                              try {
                                const newTag = await createTag({ user_id: user.id, name: tagSearch.trim() } as any);
                                setAllTags([...allTags, newTag]);
                                setSelectedTagIds([...selectedTagIds, newTag.id]);
                                setTagSearch("");
                                setShowTagDropdown(false);
                              } catch {}
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-surface-container cursor-pointer"
                          >
                            Create &ldquo;{tagSearch.trim()}&rdquo;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Contact info ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={`${labelClasses} mb-3`}>Contact info</label>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClasses}>LinkedIn URL</label>
                      <input type="url" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} className={inputClasses} placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>
                </div>

                {/* ── Follow-up ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={labelClasses}>Follow-up frequency</label>
                  <Select
                    value={
                      showCustomFrequency ? "custom"
                      : FOLLOW_UP_OPTIONS.find(o => o.days === Number(formData.follow_up_frequency_days)) ? formData.follow_up_frequency_days
                      : formData.follow_up_frequency_days ? "custom"
                      : ""
                    }
                    onChange={(val) => {
                      if (val === "custom") {
                        setShowCustomFrequency(true);
                        setFormData({ ...formData, follow_up_frequency_days: "" });
                      } else {
                        setShowCustomFrequency(false);
                        setFormData({ ...formData, follow_up_frequency_days: val });
                      }
                    }}
                    placeholder="No follow-up"
                    options={[
                      { value: "", label: "No follow-up" },
                      ...FOLLOW_UP_OPTIONS.map((o) => ({ value: o.days === -1 ? "custom" : String(o.days), label: o.label })),
                    ]}
                  />
                  {(showCustomFrequency || (formData.follow_up_frequency_days && !FOLLOW_UP_OPTIONS.find(o => o.days === Number(formData.follow_up_frequency_days)))) && (
                    <input
                      type="number"
                      value={formData.follow_up_frequency_days}
                      onChange={(e) => setFormData({ ...formData, follow_up_frequency_days: e.target.value })}
                      className={`${inputClasses} mt-2`}
                      placeholder="Number of days"
                      min="1"
                      autoFocus
                    />
                  )}
                </div>

                {/* ── Notes ── */}
                <div className="pt-2 border-t border-outline-variant">
                  <label className={labelClasses}>Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={`${inputClasses} !h-auto py-3`} rows={3} placeholder="Anything worth remembering…" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="text" onClick={closeForm}>Cancel</Button>
                  <Button type="submit">{editingContact ? "Save" : "Create"}</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Empty state */}
        {contacts.length === 0 && (
          <Card variant="outlined" className="text-center py-16">
            <CardContent>
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-base text-foreground mb-1">No contacts yet</p>
              <p className="text-sm text-muted-foreground mb-6">Add your first connection to get started.</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-[18px] w-[18px]" /> Add contact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contact list */}
        <div className="space-y-2">
          {contacts.map((contact) => {
            const isExpanded = selectedContact?.id === contact.id;
            return (
            <div
              key={contact.id}
              className={`rounded-[16px] border transition-all duration-200 cursor-pointer ${
                isExpanded
                  ? "bg-white border-outline-variant border-l-[3px] border-l-primary shadow-sm"
                  : "bg-white border-outline-variant/60 hover:border-outline-variant hover:shadow-sm"
              }`}
              onClick={() => handleSelectContact(contact)}
            >
              <div className="p-5">
                <div className="flex justify-between items-center gap-4">
                  {/* Avatar + info */}
                  <div className="flex gap-4 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center shrink-0 text-on-primary-container text-sm font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-medium text-foreground truncate">{contact.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {[contact.contact_status ? (contact.contact_status === "student" ? "Student" : "Professional") : null, contact.industry].filter(Boolean).join(" · ") || "No details"}
                      </p>
                    </div>
                  </div>

                  {/* Actions + chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-full text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        <ExternalLink className="h-[18px] w-[18px]" />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(contact); }} className="p-2 rounded-full text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                      <Pencil className="h-[18px] w-[18px]" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }} className="p-2 rounded-full text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ml-1 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Collapsed preview: chips */}
                {!isExpanded && (contact.contact_tags.length > 0 || contact.contact_schools.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pl-15">
                    {contact.contact_tags.map((ct) => (
                      <span key={ct.tag_id} className="inline-flex items-center h-6 px-2.5 rounded-full bg-secondary-container text-[11px] text-on-secondary-container font-medium">
                        {ct.tags.name}
                      </span>
                    ))}
                    {contact.contact_schools.slice(0, 1).map((cs) => (
                      <span key={cs.id} className="inline-flex items-center h-6 px-2.5 rounded-full bg-surface-container text-[11px] text-muted-foreground">
                        {cs.schools.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5">
                  {/* Detail rows */}
                  <div className="pl-15 space-y-3">
                    {/* Tags & chips */}
                    {(contact.contact_emails.length > 0 || contact.contact_phones.length > 0 || contact.contact_tags.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {contact.contact_emails.map((email) => (
                          <span key={email.id} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] bg-surface-container-low text-xs text-foreground">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {email.email}{email.is_primary && <span className="text-primary font-medium">·primary</span>}
                          </span>
                        ))}
                        {contact.contact_phones.map((phone) => (
                          <span key={phone.id} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] bg-surface-container-low text-xs text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {phone.phone}<span className="text-muted-foreground capitalize">·{phone.type}</span>{phone.is_primary && <span className="text-primary font-medium">·primary</span>}
                          </span>
                        ))}
                        {contact.contact_tags.map((ct) => (
                          <span key={ct.tag_id} className="inline-flex items-center h-7 px-3 rounded-full bg-secondary-container text-xs text-on-secondary-container font-medium">
                            {ct.tags.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Companies & schools */}
                    {(contact.contact_companies.length > 0 || contact.contact_schools.length > 0) && (
                      <div className="space-y-1">
                        {contact.contact_companies.map((cc) => (
                          <p key={cc.id} className="text-xs text-muted-foreground">
                            {cc.title} at {cc.companies.name}
                            {cc.start_date && ` · ${cc.start_date} – ${cc.end_date || "Present"}`}
                          </p>
                        ))}
                        {contact.contact_schools.map((cs) => (
                          <p key={cs.id} className="text-xs text-muted-foreground">
                            {cs.degree} in {cs.field_of_study} · {cs.schools.name}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Met through */}
                    {contact.met_through && (
                      <p className="text-xs text-muted-foreground">Met through: {contact.met_through}</p>
                    )}

                    {/* Notes */}
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                    )}
                  </div>

                  {/* Activity — meetings & interactions combined */}
                  <div className="mt-5 pl-15 pt-4 border-t border-outline-variant/50">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Calendar className="h-3.5 w-3.5" /> Activity{(contactMeetings.length + contactInteractions.length) > 0 ? ` (${contactMeetings.length + contactInteractions.length})` : ""}
                    </h4>
                    {loadingMeetings ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        <span className="text-xs">Loading…</span>
                      </div>
                    ) : (contactMeetings.length === 0 && contactInteractions.length === 0) ? (
                      <p className="text-xs text-muted-foreground py-1">No activity yet.</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {[
                          ...contactMeetings.map((m) => ({ kind: "meeting" as const, date: m.meeting_date, data: m })),
                          ...contactInteractions.map((i) => ({ kind: "interaction" as const, date: i.interaction_date, data: i })),
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 8)
                          .map((item) =>
                            item.kind === "meeting" ? (
                              <div key={`m-${item.data.id}`} onClick={(e) => { e.stopPropagation(); setSelectedMeeting(item.data as typeof contactMeetings[0]); }} className="flex items-start gap-3 p-3 rounded-[12px] bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                                  <Calendar className="h-3.5 w-3.5 text-on-secondary-container" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground capitalize">{(item.data as typeof contactMeetings[0]).meeting_type}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  </div>
                                  {(item.data as typeof contactMeetings[0]).notes && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(item.data as typeof contactMeetings[0]).notes}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div key={`i-${item.data.id}`} className="flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-low group">
                                <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                                  <MessageSquare className="h-3.5 w-3.5 text-on-tertiary-container" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground capitalize">{(item.data as InteractionRow).interaction_type}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  </div>
                                  {(item.data as InteractionRow).summary && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(item.data as InteractionRow).summary}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={(e) => {
                                    e.stopPropagation();
                                    const interaction = item.data as InteractionRow;
                                    setEditingInteraction(interaction);
                                    setInteractionForm({
                                      interaction_date: interaction.interaction_date,
                                      interaction_type: interaction.interaction_type,
                                      summary: interaction.summary || "",
                                    });
                                    setShowInteractionModal(true);
                                  }} className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer" title="Edit">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button type="button" onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm("Delete this interaction?")) return;
                                    try {
                                      await deleteInteraction(item.data.id);
                                      setContactInteractions(contactInteractions.filter(x => x.id !== item.data.id));
                                    } catch {}
                                  }} className="p-1 rounded-full text-muted-foreground hover:text-destructive cursor-pointer" title="Delete">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        {(contactMeetings.length + contactInteractions.length) > 8 && (
                          <p className="text-xs text-primary font-medium pt-1">+{contactMeetings.length + contactInteractions.length - 8} more</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="tonal"
                        size="sm"
                        onClick={() => {
                          window.location.href = "/meetings";
                        }}
                      >
                        <Calendar className="h-4 w-4" /> Add meeting
                      </Button>
                      <Button
                        type="button"
                        variant="tonal"
                        size="sm"
                        onClick={() => {
                          setEditingInteraction(null);
                          setInteractionForm({ interaction_date: new Date().toISOString().split("T")[0], interaction_type: "", summary: "" });
                          setShowInteractionModal(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" /> Add interaction
                      </Button>
                    </div>
                  </div>

                  {/* Pending action items */}
                  <div className="mt-5 pl-15 pt-4 border-t border-outline-variant/50">
                    {(() => {
                      const now = new Date();
                      const oneMonthOut = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                      const filtered = contactActions.filter(a =>
                        !a.due_at || new Date(a.due_at) <= oneMonthOut
                      );
                      return (
                        <>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                            <CheckSquare className="h-3.5 w-3.5" /> Pending actions{filtered.length > 0 ? ` (${filtered.length})` : ""}
                          </h4>
                          {filtered.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No pending action items due soon.</p>
                          ) : (
                            <div className="space-y-1.5 mb-3">
                              {filtered.map((action) => (
                                editingContactActionId === action.id ? (
                                  <div key={action.id} className="p-3 rounded-[8px] bg-surface-container space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <input type="text" value={editCATitle} onChange={(e) => setEditCATitle(e.target.value)} className={`${inputClasses} !h-10 text-sm`} placeholder="Title" />
                                    <textarea value={editCADescription} onChange={(e) => setEditCADescription(e.target.value)} className={`${inputClasses} !h-auto py-2 text-sm`} rows={2} placeholder="Description (optional)" />
                                    <ContactPicker allContacts={contacts.map(c => ({ id: c.id, name: c.name }))} selectedIds={editCAContactIds} onChange={setEditCAContactIds} />
                                    <DatePicker value={editCADueDate} onChange={setEditCADueDate} placeholder="No due date" />
                                    <div className="flex justify-end gap-2">
                                      <Button type="button" variant="text" size="sm" onClick={() => setEditingContactActionId(null)}>Cancel</Button>
                                      <Button type="button" size="sm" onClick={async () => {
                                        try {
                                          await updateActionItem(action.id, { title: editCATitle.trim(), description: editCADescription.trim() || null, due_at: editCADueDate || null });
                                          await replaceContactsForActionItem(action.id, editCAContactIds);
                                          await reloadContactActions(contact.id);
                                          setEditingContactActionId(null);
                                        } catch (err) { console.error("Error updating action:", err); }
                                      }}>Save</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div key={action.id} className="flex items-center gap-2 text-sm group">
                                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-foreground flex-1 min-w-0 truncate">{action.title}</span>
                                    {action.due_at && (
                                      <span className={`text-xs shrink-0 ${new Date(action.due_at) < new Date() ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                        {new Date(action.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingContactActionId(action.id); setEditCATitle(action.title); setEditCADescription(action.description || ""); setEditCADueDate(action.due_at ? action.due_at.split("T")[0] : ""); setEditCAContactIds(action.action_item_contacts?.map(ac => ac.contact_id) || []); }} className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer" title="Edit">
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button type="button" onClick={async (e) => { e.stopPropagation(); try { await updateActionItem(action.id, { is_completed: true, completed_at: new Date().toISOString() }); await reloadContactActions(contact.id); } catch {} }} className="p-1 rounded-full text-muted-foreground hover:text-primary cursor-pointer" title="Mark done">
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button type="button" onClick={async (e) => { e.stopPropagation(); if (!confirm("Delete this action item?")) return; try { await deleteActionItem(action.id); await reloadContactActions(contact.id); } catch {} }} className="p-1 rounded-full text-muted-foreground hover:text-destructive cursor-pointer" title="Delete">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <Button
                      type="button"
                      variant="tonal"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionContactId(contact.id);
                        setShowActionModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add action item
                    </Button>

                    {/* Completed actions */}
                    {contactCompletedActions.length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowContactCompleted(!showContactCompleted); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${showContactCompleted ? "rotate-0" : "-rotate-90"}`} />
                          Completed ({contactCompletedActions.length})
                        </button>
                        {showContactCompleted && (
                          <div className="space-y-1.5 mt-2">
                            {contactCompletedActions.map((action) => (
                              <div key={action.id} className="flex items-center gap-2 text-sm">
                                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span className="text-muted-foreground line-through">{action.title}</span>
                                {action.completed_at && (
                                  <span className="text-xs text-muted-foreground">
                                    · {new Date(action.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attachments section */}
                  <div className="mt-5 pl-15 pt-4 border-t border-outline-variant/50">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Paperclip className="h-3.5 w-3.5" /> Attachments{contactAttachments.length > 0 ? ` (${contactAttachments.length})` : ""}
                    </h4>

                    {contactAttachments.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {contactAttachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2 text-sm group">
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <button
                              type="button"
                              className="text-primary hover:underline truncate max-w-[200px] cursor-pointer text-left"
                              onClick={(e) => { e.stopPropagation(); handleAttachmentDownload(att.object_path, att.file_name); }}
                            >
                              {att.file_name}
                            </button>
                            {att.file_size_bytes && (
                              <span className="text-xs text-muted-foreground">
                                {att.file_size_bytes < 1024 ? `${att.file_size_bytes} B`
                                  : att.file_size_bytes < 1048576 ? `${(att.file_size_bytes / 1024).toFixed(0)} KB`
                                  : `${(att.file_size_bytes / 1048576).toFixed(1)} MB`}
                              </span>
                            )}
                            <button
                              type="button"
                              className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleAttachmentDelete(att.id, att.object_path); }}
                              title="Delete attachment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {attachmentUploading ? "Uploading…" : "Add file"}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAttachmentUpload}
                        disabled={attachmentUploading}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Meeting detail modal */}
        {selectedMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/32" onClick={() => { setSelectedMeeting(null); setEditingMeetingMode(false); }} />
            <div className="relative w-full max-w-lg bg-surface-container-high rounded-[28px] shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 pt-6 pb-2 flex items-start justify-between">
                <div>
                  <h2 className="text-[22px] leading-7 font-normal text-foreground capitalize">{selectedMeeting.meeting_type}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    {" at "}
                    {new Date(selectedMeeting.meeting_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => { setSelectedMeeting(null); setEditingMeetingMode(false); }} className="p-2 rounded-full text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-6 pb-6 space-y-4">
                {editingMeetingMode ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
                      <textarea
                        value={meetingEditNotes}
                        onChange={(e) => setMeetingEditNotes(e.target.value)}
                        className={`${inputClasses} !h-auto py-3`}
                        rows={6}
                        placeholder="Key takeaways, action items…"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Transcript</label>
                      <textarea
                        value={meetingEditTranscript}
                        onChange={(e) => setMeetingEditTranscript(e.target.value)}
                        className={`${inputClasses} !h-auto py-3`}
                        rows={12}
                        placeholder="Paste your full meeting transcript here…"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="text" onClick={() => setEditingMeetingMode(false)}>Cancel</Button>
                      <Button
                        type="button"
                        disabled={meetingSaving}
                        loading={meetingSaving}
                        onClick={async () => {
                          setMeetingSaving(true);
                          try {
                            await updateMeeting(selectedMeeting.id, {
                              notes: meetingEditNotes.trim() || null,
                              transcript: meetingEditTranscript.trim() || null,
                            });
                            setSelectedMeeting({ ...selectedMeeting, notes: meetingEditNotes.trim() || null, transcript: meetingEditTranscript.trim() || null });
                            // Refresh meetings list
                            if (selectedContact) {
                              const meetings = await getMeetingsForContact(selectedContact.id);
                              setContactMeetings(meetings);
                            }
                            setEditingMeetingMode(false);
                          } catch (err) { console.error("Error updating meeting:", err); }
                          finally { setMeetingSaving(false); }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedMeeting.notes ? (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedMeeting.notes}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No notes recorded.</p>
                    )}
                    {selectedMeeting.transcript && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Transcript</h3>
                        <div className="bg-surface-container-low rounded-[12px] p-4 max-h-[60vh] overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{selectedMeeting.transcript}</pre>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="text" onClick={() => {
                        setMeetingEditNotes(selectedMeeting.notes || "");
                        setMeetingEditTranscript(selectedMeeting.transcript || "");
                        setEditingMeetingMode(true);
                      }}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button type="button" variant="text" onClick={() => { setSelectedMeeting(null); setEditingMeetingMode(false); }}>Close</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action item modal */}
        {showActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/32" onClick={() => { setShowActionModal(false); setActionTitle(""); setActionDescription(""); setActionDueDate(""); setActionMeetingId(null); }} />
            <div className="relative w-full max-w-md bg-surface-container-high rounded-[28px] shadow-lg">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-[22px] leading-7 font-normal text-foreground">New action item</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  For {contacts.find((c) => c.id === actionContactId)?.name}
                </p>
              </div>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-low text-foreground rounded-[4px] border border-outline placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-sm"
                    placeholder="Follow up about…"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                  <textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    className="w-full h-auto px-4 py-3 bg-surface-container-low text-foreground rounded-[4px] border border-outline placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-sm"
                    rows={2}
                    placeholder="Optional details…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due date</label>
                  <DatePicker value={actionDueDate} onChange={setActionDueDate} placeholder="No due date" />
                </div>
                {contactMeetings.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link to meeting</label>
                    <Select
                      value={String(actionMeetingId ?? "")}
                      onChange={(val) => setActionMeetingId(val ? Number(val) : null)}
                      placeholder="No linked meeting"
                      options={[
                        { value: "", label: "No linked meeting" },
                        ...contactMeetings.map((m) => ({
                          value: String(m.id),
                          label: `${m.meeting_type.charAt(0).toUpperCase() + m.meeting_type.slice(1)} — ${new Date(m.meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                        })),
                      ]}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="text" onClick={() => { setShowActionModal(false); setActionTitle(""); setActionDescription(""); setActionDueDate(""); setActionMeetingId(null); }}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!actionTitle.trim() || actionSaving}
                    loading={actionSaving}
                    onClick={async () => {
                      if (!user || !actionContactId || !actionTitle.trim()) return;
                      setActionSaving(true);
                      try {
                        await createActionItem({
                          user_id: user.id,
                          contact_id: actionContactId,
                          meeting_id: actionMeetingId,
                          title: actionTitle.trim(),
                          description: actionDescription.trim() || null,
                          due_at: actionDueDate || null,
                          is_completed: false,
                          created_at: new Date().toISOString(),
                          completed_at: null,
                        });
                        setShowActionModal(false);
                        setActionTitle("");
                        setActionDescription("");
                        setActionDueDate("");
                        setActionMeetingId(null);
                        setActionContactId(null);
                      } catch (err) {
                        console.error("Error creating action item:", err);
                      } finally {
                        setActionSaving(false);
                      }
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interaction create/edit modal */}
        {showInteractionModal && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/32" onClick={() => setShowInteractionModal(false)} />
            <div className="relative w-full max-w-lg bg-surface-container-high rounded-[28px] shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-[22px] leading-7 font-normal text-foreground">
                  {editingInteraction ? "Edit interaction" : "New interaction"}
                </h2>
              </div>
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={interactionForm.interaction_date}
                      onChange={(e) => setInteractionForm({ ...interactionForm, interaction_date: e.target.value })}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Type *</label>
                    <Select
                      required
                      value={interactionForm.interaction_type}
                      onChange={(val) => setInteractionForm({ ...interactionForm, interaction_type: val })}
                      placeholder="Select…"
                      options={[
                        { value: "email", label: "Email" },
                        { value: "phone", label: "Phone Call" },
                        { value: "video", label: "Video Call" },
                        { value: "coffee", label: "Coffee Chat" },
                        { value: "lunch", label: "Lunch/Dinner" },
                        { value: "conference", label: "Conference" },
                        { value: "social", label: "Social Media" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Summary</label>
                  <textarea
                    value={interactionForm.summary}
                    onChange={(e) => setInteractionForm({ ...interactionForm, summary: e.target.value })}
                    className={`${inputClasses} !h-auto py-3`}
                    rows={4}
                    placeholder="What was discussed? Key takeaways?"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="text" onClick={() => setShowInteractionModal(false)}>Cancel</Button>
                  <Button
                    type="button"
                    disabled={!interactionForm.interaction_date || !interactionForm.interaction_type}
                    onClick={async () => {
                      try {
                        if (editingInteraction) {
                          await updateInteraction(editingInteraction.id, {
                            interaction_date: interactionForm.interaction_date,
                            interaction_type: interactionForm.interaction_type,
                            summary: interactionForm.summary || null,
                          });
                        } else {
                          await createInteraction({
                            contact_id: selectedContact.id,
                            interaction_date: interactionForm.interaction_date,
                            interaction_type: interactionForm.interaction_type,
                            summary: interactionForm.summary || null,
                          });
                        }
                        const updated = await getInteractions(selectedContact.id);
                        setContactInteractions(updated);
                        setShowInteractionModal(false);
                        setEditingInteraction(null);
                      } catch (err) {
                        console.error("Error saving interaction:", err);
                      }
                    }}
                  >
                    {editingInteraction ? "Save" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
