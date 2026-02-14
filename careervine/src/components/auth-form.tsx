/**
 * Authentication form component — M3 styled
 *
 * Handles sign-in and sign-up with Material Design 3 text fields,
 * CareerVine branding, and M3 color tokens.
 */

"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Mail, Lock, User, Eye, EyeOff, Sprout } from "lucide-react";

export default function AuthForm() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const result = await signUp(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );
        if (result.error) setError(result.error);
      } else {
        const result = await signIn(formData.email, formData.password);
        if (result.error) setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const inputClasses =
    "w-full h-14 pl-12 pr-4 bg-surface-container-low text-foreground rounded-[4px] border border-outline placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-2 transition-colors text-base";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="text-center mb-10">
          <Sprout className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-[28px] leading-9 font-normal text-foreground mb-1">
            {mode === "signin" ? "Welcome back" : "Get started"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to CareerVine"
              : "Create your CareerVine account"}
          </p>
        </div>

        <Card variant="outlined">
          <CardContent className="px-6 py-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Error */}
              {error && (
                <div className="bg-error-container text-on-error-container px-4 py-3 rounded-[12px] text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputClasses} !pr-12`}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Name fields — sign up only */}
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="First name"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="Last name"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            {/* Mode toggle */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    New to CareerVine?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-medium text-primary hover:underline cursor-pointer"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="font-medium text-primary hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
