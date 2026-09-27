"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NotFoundPage() {
  const router = useRouter();

  useEffect(() => {
    toast.error("Page not found! Redirecting you to the sign in page.", {
      style: {
        background: "#dc2626",
        color: "#ffffff",
        border: "1px solid #b91c1c",
      },
    });
    router.replace("/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50" />
  );
}