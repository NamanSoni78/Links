import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Links account password with an email code.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
