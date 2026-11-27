"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const PROMPT_WORDS = [
  "checkout",
  "landing page",
  "mobile flow",
  "design system",
  "pricing page",
  "dashboard",
];

type PromptComposerProps = {
  onStartDesign?: (prompt: string) => void;
};

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M3.75 10h12.5m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function PromptComposer({
  onStartDesign,
}: PromptComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [displayWord, setDisplayWord] = useState(PROMPT_WORDS[0]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || hasInteracted) {
      return;
    }

    let wordIndex = 0;
    let characterCount = PROMPT_WORDS[0].length;
    let deleting = true;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentWord = PROMPT_WORDS[wordIndex];

      if (deleting) {
        characterCount -= 1;
        setDisplayWord(currentWord.slice(0, characterCount));

        if (characterCount === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % PROMPT_WORDS.length;
          timeout = setTimeout(tick, 220);
          return;
        }

        timeout = setTimeout(tick, 34);
        return;
      }

      const nextWord = PROMPT_WORDS[wordIndex];
      characterCount += 1;
      setDisplayWord(nextWord.slice(0, characterCount));

      if (characterCount === nextWord.length) {
        deleting = true;
        timeout = setTimeout(tick, 1050);
        return;
      }

      timeout = setTimeout(tick, 70);
    };

    timeout = setTimeout(tick, 1200);
    return () => clearTimeout(timeout);
  }, [hasInteracted, prefersReducedMotion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt) {
      onStartDesign?.(trimmedPrompt);
    }
  };

  const handleComposerClick = (event: MouseEvent<HTMLFormElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button")
    ) {
      return;
    }

    inputRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="composer-heading"
      className="floo-composer-vignette relative mx-auto mt-[34px] w-full max-w-[640px] px-1"
      id="composer"
      aria-describedby="composer-description"
    >
      <span
        aria-hidden="true"
        className="absolute -top-6"
        id="how-it-works"
      />
      <h2
        className="floo-rise font-caveat text-[34px] font-bold leading-[1.25] text-white"
        id="composer-heading"
        style={{ animationDelay: "450ms" }}
      >
        Open a canvas. Invite your agents.
      </h2>
      <p
        className="floo-rise mt-2 mb-4 text-[15px] leading-[22.5px] text-[#99A1AF]"
        id="composer-description"
        style={{ animationDelay: "530ms" }}
      >
        Bring Claude Code, Codex or Cursor, or run the Floo Agent on your own
        key.
      </p>

      <div
        className="floo-composer-border rounded-[17px] p-px shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)]"
        style={{ animationDelay: "610ms" }}
      >
        <form
          aria-label="Design prompt"
          className="flex items-center gap-3 rounded-[16px] bg-[#121215] p-2.5 pl-[18px] sm:p-3 sm:pl-[18px]"
          onClick={handleComposerClick}
          onSubmit={handleSubmit}
        >
          <div className="relative h-[42px] min-w-0 flex-1">
            {!hasInteracted && prompt.length === 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap text-[14px] text-[#8E8E98] sm:text-[16px]"
              >
                Let’s design a{" "}
                <strong className="ml-1 font-bold text-white">
                  {displayWord}
                </strong>
                <span className="floo-caret ml-1 inline-block h-[19px] w-0.5 shrink-0 bg-[#A4F002]" />
              </span>
            )}
            <input
              aria-label="What would you like to design?"
              autoComplete="off"
              className={`relative z-[1] h-full w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-[#8E8E98] sm:text-[16px] ${
                !hasInteracted && prompt.length === 0
                  ? "text-transparent caret-transparent"
                  : "text-white caret-[#A4F002]"
              }`}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              onFocus={() => setHasInteracted(true)}
              placeholder={hasInteracted ? "Describe your design..." : ""}
              ref={inputRef}
              spellCheck={false}
              value={prompt}
            />
          </div>
          <button
            className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[10px] bg-white px-[14px] text-[14px] font-semibold text-black transition-colors hover:bg-[#E5E7EB] sm:px-[18px] sm:text-[15px]"
            type="submit"
          >
            Start
            <ArrowIcon className="h-[18px] w-[18px]" />
          </button>
        </form>
      </div>
    </section>
  );
}
