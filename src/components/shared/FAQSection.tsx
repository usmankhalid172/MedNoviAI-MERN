"use client";

import { useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";

const faqs = [
  {
    question: "What is MedNoviAI?",
    answer:
      "MedNoviAI is a healthcare platform that helps you understand your symptoms, explore helpful health guidance, and connect with trusted doctors for appointments.",
  },
  {
    question: "Can MedNoviAI diagnose my condition?",
    answer:
      "MedNoviAI does not replace a qualified medical professional or provide a final diagnosis. It offers general guidance to help you prepare for a conversation with a doctor.",
  },
  {
    question: "How does the AI health assistant work?",
    answer:
      "Describe what you are feeling in your own words. The assistant reviews the information you share and suggests helpful next steps or the type of specialist you may want to consult.",
  },
  {
    question: "How do I book an appointment?",
    answer:
      "Use the Book an Appointment or Chat with AI button, review the available doctor profiles, and choose a convenient appointment time from the booking flow.",
  },
  {
    question: "Are my health conversations private?",
    answer:
      "Your health questions should be shared thoughtfully. MedNoviAI is designed with privacy in mind, but you should avoid sharing passwords, payment details, or other highly sensitive information in chat.",
  },
  {
    question: "When should I contact a doctor immediately?",
    answer:
      "For severe, sudden, or life-threatening symptoms, contact your local emergency service immediately. Do not wait for an AI response when urgent medical care may be needed.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-x border-b border-[#244f87] bg-[#102f5f] px-6 py-10 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-4xl text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#1e4f8d] text-[#bfdbfe]">
          <CircleHelp className="size-6" />
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#bfdbfe]">Need to know</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Frequently Asked Questions</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#dbeafe] sm:text-base">
          Find clear answers about the AI assistant, doctor recommendations, appointments, and how MedNoviAI supports your healthcare journey.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-4xl space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={faq.question} className="overflow-hidden rounded-2xl border border-[#3769a4] bg-[#163e76] shadow-sm">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white transition-colors hover:bg-[#1e4f8d] sm:px-6"
              >
                <span>{faq.question}</span>
                <ChevronDown className={`size-5 shrink-0 text-[#bfdbfe] transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-[#3769a4] px-5 pb-5 pt-4 text-sm leading-6 text-[#dbeafe] sm:px-6">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
