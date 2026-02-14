/**
 * Settings page — user profile and account management
 *
 * Two sections:
 *   1. Profile: edit first_name, last_name, phone (saved to public.users table)
 *   2. Change password: new password + confirm, uses supabase.auth.updateUser()
 *
 * Data flow:
 *   Load: getUserProfile(userId) → populate form
 *   Save: updateUserProfile(userId, updates)
 *   Password: createSupabaseBrowserClient().auth.updateUser({ password })
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserProfile, updateUserProfile } from "@/lib/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User, Phone, Mail, Check, Lock } from "lucide-react";

const inputClasses =
  "w-full h-14 px-4 bg-surface-container-low text-foreground rounded-[4px] border border-outline placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-sm";
const labelClasses = "block text-xs font-medium text-muted-foreground mb-1.5";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.id);
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-sm">Loading profile…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-[28px] leading-9 font-normal text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile</p>
        </div>

        <Card variant="outlined">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-lg font-medium">
                {(firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Your profile"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> First name</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClasses}
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClasses}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className={`${inputClasses} opacity-50 cursor-not-allowed`}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Email is managed through authentication and cannot be changed here.</p>
              </div>

              <div>
                <label className={labelClasses}>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClasses}
                  placeholder="555-123-4567 (optional)"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium animate-pulse">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        {/* Change password */}
        <Card variant="outlined" className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-medium text-foreground">Change password</h2>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError("");
              if (newPassword.length < 6) {
                setPasswordError("Password must be at least 6 characters.");
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordError("Passwords do not match.");
                return;
              }
              setPasswordSaving(true);
              try {
                const supabase = createSupabaseBrowserClient();
                const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
                if (pwErr) throw pwErr;
                setNewPassword("");
                setConfirmPassword("");
                setPasswordSaved(true);
                setTimeout(() => setPasswordSaved(false), 2500);
              } catch (err: unknown) {
                console.error("Error changing password:", err);
                setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
              } finally {
                setPasswordSaving(false);
              }
            }} className="space-y-4">
              <div>
                <label className={labelClasses}>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClasses}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className={labelClasses}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClasses}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={passwordSaving}>
                  Update password
                </Button>
                {passwordSaved && (
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium animate-pulse">
                    <Check className="h-4 w-4" /> Password updated
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
