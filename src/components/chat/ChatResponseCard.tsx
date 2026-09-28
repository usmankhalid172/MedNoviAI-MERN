"use client";
import React from "react";
import { AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
interface ChatResponseCardProps {
  content: string;
  suggestedPrompts?: string[];
  onPromptClick?: (prompt: string) => void;
}
export const ChatResponseCard: React.FC<ChatResponseCardProps> = ({
  content,
  suggestedPrompts = [],
  onPromptClick,
}) => {
  const paragraphs = content.split("\n\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        if (paragraph.startsWith("⚠️")) {
          return (
            <div key={index} className="flex gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <div>{paragraph.replace("⚠️", "").trim()}</div>
            </div>
          );
        }
        if (paragraph.toLowerCase().startsWith("disclaimer:")) {
          return (
            <p key={index} className="text-[11px] italic text-slate-400 border-t border-slate-800 pt-2 mt-2">
              {paragraph}
            </p>
          );
        }
        if (paragraph.includes("\n1.") || paragraph.includes("\n-")) {
          const lines = paragraph.split("\n");
          const header = lines[0];
          const items = lines.slice(1);
          return (
            <div key={index} className="space-y-1.5 text-xs text-slate-200">
              {header && <p className="font-semibold text-blue-300">{header}</p>}
              <ul className="space-y-1 pl-1">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{item.replace(/^[0-9]+\.\s*|^-\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p key={index} className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
            {paragraph}
          </p>
        );
      })}
      {suggestedPrompts.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-300 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Suggested Follow-ups:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onPromptClick && onPromptClick(prompt)}
                className="rounded-full border border-blue-500/30 bg-[#173b68]/70 px-3 py-1 text-[11px] text-blue-200 hover:bg-[#173b68] hover:text-white transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
