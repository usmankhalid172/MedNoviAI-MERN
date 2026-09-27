"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { name: "How does it work?", href: "#how-it-works" },
  { name: "About us", href: "#doctors" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
];

export const Navbar: React.FC = () => {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/login");
  };

  const authActions = isLoggedIn ? (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 md:w-auto"
    >
      <LogOut className="size-4" />
      Logout
    </button>
  ) : (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <Link
        href="/login"
        onClick={() => setOpen(false)}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-500 px-4 text-sm text-white transition-colors hover:bg-blue-600"
      >
        Login
      </Link>
      <Link
        href="/signup"
        onClick={() => setOpen(false)}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-500 px-4 text-sm text-white transition-colors hover:bg-blue-600"
      >
        Sign Up
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#244f87] bg-[#102f5f]/95 text-white backdrop-blur">
      <div className="responsive-container mx-auto flex h-16 max-w-7xl items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Stethoscope className="size-5 text-blue-300" /> MedNoviAI
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-3 md:flex">{authActions}</div>

        {/* Mobile Navigation Drawer */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-[#102f5f] text-white sm:w-80 border-l border-[#244f87]">
              <SheetHeader className="px-6 pt-4 text-left">
                <SheetTitle className="text-xl font-bold text-white">MedNoviAI</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2 px-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/10"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 px-6">{authActions}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;