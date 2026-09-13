"use client";

import React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { name: "Dashboard", href: "/doctor/dashboard" },
  { name: "Patients", href: "#" },
  { name: "Appointments", href: "#" },
];

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-primary"
        >
          MedNoviAI
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-primary"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <Menu className="h-5 w-5" />
            </SheetTrigger>

            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader className="text-left px-6 pt-4">
                <SheetTitle className="text-xl font-bold text-primary">
                  MedNoviAI
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8 flex flex-col gap-2 px-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-primary"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
};

export default Navbar;