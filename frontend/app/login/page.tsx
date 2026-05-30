"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Maximum 30 characters", test: (p: string) => p.length <= 30 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const switchMode = () => {
    setIsSignUp((v) => !v);
    setErrors({});
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: typeof errors = {};
    if (!email) fieldErrors.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
    if (!password) fieldErrors.password = "Password is required.";
    else if (isSignUp && PASSWORD_RULES.some((r) => !r.test(password))) fieldErrors.password = "Password doesn't meet all requirements.";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created! You are now signed in.");
          router.push("/");
          router.refresh();
        } else {
          setConfirmationPending(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-8">
        <Image src="/lexis_automator_logo.svg" alt="Lexis Automator" width={40} height={40} className="rounded-md" />
        <span className="text-2xl font-bold tracking-tight text-indigo-900">Lexis Automator</span>
      </Link>

      <div className="w-full max-w-sm bg-white border rounded-xl p-8 shadow-sm space-y-6">
        {confirmationPending ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
            <p className="text-sm text-slate-500">
              We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
              Click it to activate your account, then sign in.
            </p>
            <button
              type="button"
              onClick={() => { setConfirmationPending(false); setIsSignUp(false); }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold text-slate-900">
                {isSignUp ? "Create an account" : "Sign in"}
              </h1>
              <p className="text-sm text-slate-500">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                  className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    maxLength={30}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                    className={errors.password ? "border-red-400 focus-visible:ring-red-400 pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                {isSignUp && (
                  <ul className="space-y-1 pt-1">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-slate-400"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${met ? "bg-green-500" : "bg-slate-300"}`} />
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
