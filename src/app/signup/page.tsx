import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Create account — MedNoviAI",
  description: "Create a patient or doctor account with MedNoviAI.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
