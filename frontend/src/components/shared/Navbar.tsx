import React, { useState } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  User,
  LogOut,
  PieChart,
  Stethoscope,
  UserCheck,
  UserPlus,
  Accessibility,
  CreditCard,
  HelpCircle,
  SlidersHorizontal,
  ShieldAlert,
} from "lucide-react";

import Image from 'next/image';
import LogoImage from '@/app/Logo.png';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);

  // Close all open menus when overlay is clicked
  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    setIsSearchOpenMobile(false);
  };

  return (
    <>
      {/* GLOBAL BACKDROP OVERLAY (Closes dropdowns & mobile drawers on outside click) */}
      {(isMobileMenuOpen || isProfileOpen || isSearchOpenMobile) && (
        <div
          onClick={closeAllMenus}
          className="fixed inset-0 z-30 bg-black/10 transition-opacity"
          aria-hidden="true"
        />
      )}

      <header className="fixed top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs lg:pr-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* 1. LEFT SECTION: Logo & Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 md:hidden focus:outline-none"
                aria-label="Toggle Navigation"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Logo Image (eHealth Guide) */}
              <Link href="/appointment/book" className="flex items-center gap-2">
                <img
                  src="/Logo.png"
                  alt="eHealth Guide Logo"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* 2. MIDDLE SECTION: Nav Links & Search (Desktop & Tablet Layout) */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center mr-4">
              {/* Navigation Links */}
              <nav className="flex items-center gap-5 lg:gap-7 text-sm font-medium text-gray-700 whitespace-nowrap">
                <a
                  href="#how-it-works"
                  className="hover:text-blue-600 transition-colors"
                >
                  How does it work?
                </a>
                <a
                  href="#about"
                  className="hover:text-blue-600 transition-colors"
                >
                  About us
                </a>
                <a
                  href="#faq"
                  className="hover:text-blue-600 transition-colors"
                >
                  FAQ
                </a>
                <a
                  href="#contact"
                  className="hover:text-blue-600 transition-colors"
                >
                  Contact
                </a>
              </nav>

              {/* Search Bar */}
              <div className="relative w-48 lg:w-64">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                />
              </div>
            </div>

            {/* 3. RIGHT SECTION: Notifications & Profile */}
            <div className="flex items-center gap-3">
              {/* Search Icon Toggle for Mobile Only */}
              <button
                onClick={() => setIsSearchOpenMobile(!isSearchOpenMobile)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full md:hidden"
              >
                <Search size={20} />
              </button>

              {/* Notification Bell Badge */}
              <button
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full relative transition-colors"
                aria-label="Notifications"
              >
                <Bell size={22} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  9
                </span>
              </button>

              {/* User Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center focus:outline-none ring-2 ring-transparent hover:ring-blue-200 rounded-full transition-all"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
                    alt="User Profile"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">
                        Dr. Sarah Taylor
                      </p>
                      <p className="text-xs text-gray-500">
                        sarah.taylor@ehealth.com
                      </p>
                    </div>

                    <a
                      href="#profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <User size={16} /> Profile
                    </a>
                    <a
                      href="#settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <SlidersHorizontal size={16} /> Account Settings
                    </a>
                    <a
                      href="#privacy"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <ShieldAlert size={16} /> Privacy Policy
                    </a>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => {
                        closeAllMenus();
                        alert("Signing out...");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH BAR TOGGLE */}
        {isSearchOpenMobile && (
          <div className="p-3 border-t border-gray-100 bg-gray-50 md:hidden animate-in slide-in-from-top">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-white text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* MOBILE NAVIGATION DRAWER */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top">
            <nav className="flex flex-col gap-1">
              <a
                href="#how-it-works"
                onClick={closeAllMenus}
                className="px-3 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium"
              >
                How does it work?
              </a>
              <a
                href="#about"
                onClick={closeAllMenus}
                className="px-3 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium"
              >
                About us
              </a>
              <a
                href="#faq"
                onClick={closeAllMenus}
                className="px-3 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium"
              >
                FAQ
              </a>
              <a
                href="#contact"
                onClick={closeAllMenus}
                className="px-3 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium"
              >
                Contact
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* 4. TABLET OPTION 2: VERTICAL SIDEBAR MENU (Visible on tablet screens `sm` to `lg`) */}
      <aside className="hidden sm:flex lg:hidden fixed left-0 top-16 sm:top-20 bottom-0 w-16 bg-white border-r border-gray-100 shadow-md flex-col items-center py-6 justify-between z-30">
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            className="p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
            title="Analytics"
          >
            <PieChart size={22} />
          </button>
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Medical"
          >
            <Stethoscope size={22} />
          </button>
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Doctors"
          >
            <UserCheck size={22} />
          </button>
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Patients"
          >
            <UserPlus size={22} />
          </button>
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Accessibility"
          >
            <Accessibility size={22} />
          </button>
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Billing"
          >
            <CreditCard size={22} />
          </button>
        </div>

        {/* Bottom Help Icon */}
        <div className="w-full flex justify-center pt-4 border-t border-gray-100">
          <button
            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Help"
          >
            <HelpCircle size={22} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
