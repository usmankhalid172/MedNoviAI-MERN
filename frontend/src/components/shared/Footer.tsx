import React from "react";
import Link from "next/link";
import { ArrowUpRight, HeartPulse, Mail, ShieldCheck, Stethoscope } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer id="contact" className="w-full scroll-mt-20 border-t border-[#c9ddf5] bg-[#123b6d] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-[-0.03em]">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#dcefe8] text-[#159b80]"><Stethoscope className="size-[18px]" /></span>
              MedNoviAI
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#c2d5ec]">A calmer, clearer way to understand your health and connect with trusted medical care.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-[#d9e8f8]"><ShieldCheck className="size-4 text-[#8fc4ff]" /> Your health conversations stay private</div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#9dccff]">Explore</h2>
            <nav className="mt-4 flex flex-col gap-3 text-sm text-[#c8daf0]"><Link href="/#how-it-works" className="transition-colors hover:text-white">How it works</Link><Link href="/#doctors" className="transition-colors hover:text-white">Featured doctors</Link><Link href="/chat" className="transition-colors hover:text-white">AI assistant</Link></nav>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#9dccff]">Company</h2>
            <nav className="mt-4 flex flex-col gap-3 text-sm text-[#c8daf0]"><a href="#" className="transition-colors hover:text-white">About us</a><a href="#" className="transition-colors hover:text-white">Privacy policy</a><a href="#" className="transition-colors hover:text-white">Terms of service</a></nav>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-[#2563eb] text-white"><HeartPulse className="size-4" /></span> Care that listens</div><p className="mt-3 text-sm leading-6 text-[#c2d5ec]">Have a question about your care journey? Our support team is here to help.</p><a href="mailto:support@mednoviai.com" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[#9dccff]"><Mail className="size-4 text-[#9dccff]" /> support@mednoviai.com <ArrowUpRight className="size-3.5" /></a></div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-[#a9c2df] sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} MedNoviAI. All rights reserved.</p><p>Built for better health decisions.</p></div>
      </div>
    </footer>
  );
};

export default Footer;