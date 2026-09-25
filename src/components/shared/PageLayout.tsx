import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 min-w-0 px-4 py-4 sm:px-5 md:px-8 md:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageLayout;