"use client";

import React from "react";
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#244f87] bg-[#102f5f]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Stethoscope className="size-5 text-blue-600" /> MedNoviAI
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <button type="button" 
            onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-red-500"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          ) : (
            <>
              <Link href="/login" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400">Login</Link>
              <Link href="/signup" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400">Sign Up</Link>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <Menu className="h-5 w-5" />
            </SheetTrigger>

            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader className="text-left px-6 pt-4">
                <SheetTitle className="text-xl font-bold text-white">
                  MedNoviAI
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2 px-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 px-6">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/login" className="rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Login</Link>
                    <Link href="/signup" className="rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Sign Up</Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
};

export default Navbar;