"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, HeartPulse, Loader2, 
  ShieldCheck, Stethoscope } from "lucide-react";
import api from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "signin" | "signup";
type Role = "patient" | "doctor";
interface AuthFormProps {
  mode: AuthMode;
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return responseMessage?.message || responseMessage?.error || "Something went wrong. Please try again.";
}

function isNetworkError(error: unknown) {
  return error instanceof Error && !("response" in error);
}

function base64Encode(value: string) {
  const ascii = unescape(encodeURIComponent(value));
  return typeof btoa === "function" ? btoa(ascii) : Buffer.from(value, "utf-8").toString("base64");
}

function createLocalToken(user: { id: string; name: string; email: string; role: string }) {
  const header = base64Encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Encode(JSON.stringify({ sub: user.id, name: user.name, email: user.email, role: user.role, iat: Math.floor(Date.now() / 1000) }));
  return `${header}.${payload}.local-signature`;
}

function createLocalUserId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `user-${Date.now()}`;
}

const LOCAL_NAME_OVERRIDES: Record<string, string> = {
  "zehabfaisal1234@gmail.com": "Zehab Faisal",
};

const USERS_KEY = "mednovi_local_users";

function getStoredLocalUsers(): Record<string, { name: string; role: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeLocalUser(email: string, record: { name: string; role: string }) {
  const users = getStoredLocalUsers();
  users[email.toLowerCase().trim()] = record;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getStoredUserName(email: string) {
  return getStoredLocalUsers()[email.toLowerCase().trim()]?.name;
}

function prettifyNameFromEmail(email: string) {
  const local = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .trim();
  const words = local
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ") || local;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("patient");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSignUp = mode === "signup";
  const handleRoleRedirect = (userRole: Role) => {
    if (userRole === "doctor") {
      router.push("/doctor/dashboard");
    } else {
      router.push("/patient/dashboard");
    }
  };

  // Show a success toast, then navigate shortly after so the user sees it.
  const showSuccessToastAndNavigate = (message: string, navigate: () => void) => {
    setToastMessage(message);
    window.setTimeout(() => {
      navigate();
    }, 1200);
  };

  // Auto-dismiss the toast if navigation hasn't already unmounted this page.
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isSignUp ? "/auth/register" : "/auth/login";
      const payload = isSignUp
        ? { name, email, password, role, ...(role === "doctor" ? { specialty } : {}) }
        : { email, password, role };
      const response = await api.post(endpoint, payload);

      const token = response.data?.token || response.data?.accessToken || response.data?.data?.token;

      if (!token && !isSignUp) {
        throw new Error("The server did not return an authentication token.");
      }

      // Signup succeeded: don't log the user in yet, send them to sign in.
      if (isSignUp) {
        showSuccessToastAndNavigate("User's registration is successful!", () => router.push("/login"));
        return;
      }

      const userRole = response.data?.user?.role || role;
      const userName = response.data?.user?.name || name;
      const userId = response.data?.user?.id || response.data?.user?._id;

      if (token) {
        saveToken(token);
        login({
          id: userId,
          name: userName,
          email: response.data?.user?.email || email,
          role: userRole,
        });
      }

      showSuccessToastAndNavigate("User's login has been successful!", () => handleRoleRedirect(userRole));
    } catch (error) {
      if (isNetworkError(error)) {
        const trimmedName = name.trim();
        if (isSignUp && trimmedName) {
          storeLocalUser(email, { name: trimmedName, role });
        }

        // Signup in offline/demo mode: also send to login instead of dashboard.
        if (isSignUp) {
          showSuccessToastAndNavigate("User's registration is successful!", () => router.push("/login"));
          return;
        }

        const localUserName =
          trimmedName ||
          LOCAL_NAME_OVERRIDES[email.toLowerCase().trim()] ||
          getStoredUserName(email) ||
          prettifyNameFromEmail(email) ||
          "Demo User";
        const localUser = {
          id: createLocalUserId(),
          name: localUserName,
          email,
          role,
        };
        const localToken = createLocalToken(localUser);
        saveToken(localToken);
        login(localUser);
        showSuccessToastAndNavigate("User's login has been successful!", () => handleRoleRedirect(role));
      } else {
        setErrorMessage(isNetworkError(error) ? error.message : getErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#102f5f] px-4 py-8 sm:px-6">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#3769a4] bg-[#163e76] shadow-2xl shadow-[#081e42]/40 lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#1e4f8d] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10" />
          <div className="relative"><Link href="/" className="flex items-center gap-2 text-lg font-bold
           text-white"><Stethoscope className="size-5 text-[#93c5fd]" /> MedNoviAI</Link><div className="mt-20"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#bfdbfe]"><HeartPulse className="size-6" /></span><h1 className="mt-6 max-w-sm text-4xl font-bold leading-tight text-white"> Healthcare that listens
            before it treats.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-[#dbeafe]">Connect with intelligent guidance and trusted doctors through one calm, secure healthcare experience.</p></div></div>
          <div className="relative flex items-center gap-2 text-xs text-[#dbeafe]"><ShieldCheck className="size-4 text-[#93c5fd]" /> Your health information is handled with care</div>
        </aside>

        <section className="bg-white min-w-0 p-6 sm:p-10">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-2xl font-semibold text-white transition-colors bg-blue-500 hover:bg-blue-700"><ArrowLeft className="size-3.5" /> Back to Home</Link>
          <div className="mb-8 lg:hidden"><Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#173b68]"><Stethoscope className="size-5 text-[#2563eb]" /> MedNoviAI</Link></div>
          <div className="max-w-md"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">{isSignUp ? "Join the care community" : "Welcome back"}</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f335f]">{isSignUp ? "Create your account" : "Sign in to MedNoviAI"}</h2><p className="mt-3 text-sm leading-6 text-[#65798d]">{isSignUp ? "Choose how you will use MedNoviAI so we can personalize your experience." : "Continue your health journey with your AI assistant and care team."}</p></div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div><p className="mb-2 text-sm font-semibold text-[#173b68]">I am joining as</p><div className="grid grid-cols-2 gap-3">{(["patient", "doctor"] as Role[]).map((option) => <button key={option} type="button" onClick={() => setRole(option)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold capitalize transition-colors ${role === option ? "border-[#2563eb] bg-[#e8f1ff] text-[#2563eb]" : "border-[#d5e2ef] bg-white text-[#718399] hover:border-[#93b9e9]"}`}><span className="block">{option}</span><span className="mt-1 block text-[11px] font-normal opacity-75">{option === "patient" ? "Find care and book visits" : "Manage patients and appointments"}</span></button>)}</div></div>
            {isSignUp && <div><label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#173b68]">Full name</label><input id="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" className="auth-input" /></div>}
            {isSignUp && role === "doctor" && <div><label htmlFor="specialty" className="mb-2 block text-sm font-semibold text-[#173b68]">Specialty</label><input id="specialty" required value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="e.g. Cardiologist" className="auth-input" /></div>}
            <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#173b68]">Email address</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input" /></div>
            <div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#173b68]">Password</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="auth-input pr-12" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718399]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
            {isSignUp && <div><label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#173b68]">Confirm password</label><input id="confirmPassword" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" className="auth-input" /></div>}
            {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}{isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}</button>
          </form>
          <p className="mt-7 text-center text-sm text-[#718399]">{isSignUp ? "Already have an account?" : "New to MedNoviAI?"} <Link href={isSignUp ? "/login" : "/signup"} className="font-semibold text-[#2563eb] hover:underline">{isSignUp ? "Sign in" : "Create an account"}</Link></p>
        </section>
      </div>
    </main>
  );
}



