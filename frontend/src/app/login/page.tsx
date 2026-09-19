import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign in — MedNoviAI",
  description: "Sign in to your MedNoviAI patient or doctor account.",
};

export default function LoginPage() {
  return <AuthForm mode="signin" />;
}