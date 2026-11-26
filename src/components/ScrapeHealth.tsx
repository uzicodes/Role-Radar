"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type BoardStatus = "ok" | "error";
type ScrapeMethod = "ats-json" | "browser";

interface BoardResult {
  name: string;
  url: string;
  status: BoardStatus;
  method: ScrapeMethod;
  jobsFound: number;
  error?: string;
}

interface ScrapeRun {
  id: string;
  totalBoards: number;
  succeededBoards: number;
  failedBoards: number;
  newJobsFound: number;
  durationMs: number | null;
  boardResults: BoardResult[];
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isBoardResult(value: unknown): value is BoardResult {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.url === "string" &&
    (value.status === "ok" || value.status === "error") &&
    (value.method === "ats-json" || value.method === "browser") &&
    isNonNegativeInteger(value.jobsFound) &&
    (value.error === undefined || typeof value.error === "string")
  );
}

function isScrapeRun(value: unknown): value is ScrapeRun {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isNonNegativeInteger(value.totalBoards) &&
    isNonNegativeInteger(value.succeededBoards) &&
    isNonNegativeInteger(value.failedBoards) &&
    isNonNegativeInteger(value.newJobsFound) &&
    (value.durationMs === null || isNonNegativeInteger(value.durationMs)) &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.boardResults) &&
    value.boardResults.every(isBoardResult)
  );
}

function formatLastSynced(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "time unavailable";

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${time} BST`;
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "N/A";
  if (durationMs < 1000) return `${durationMs} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)} sec`;

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes} min ${seconds} sec`;
}

export default function ScrapeHealth() {
  const [run, setRun] = useState<ScrapeRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const openDrawer = () => {
    setPortalRoot(document.body);
    window.requestAnimationFrame(() => setIsOpen(true));
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadLatestRun() {
      try {
        const response = await fetch("/api/jobs/health", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Health endpoint returned HTTP ${response.status}`);
        }

        const data: unknown = await response.json();
        if (data !== null && !isScrapeRun(data)) {
          throw new Error("Health endpoint returned an invalid scrape run");
        }
        setRun(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadLatestRun();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const failedBoards = useMemo(
    () => run?.boardResults.filter((board) => board.status === "error") ?? [],
    [run],
  );
  const filteredBoards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!run || !query) return run?.boardResults ?? [];

    return run.boardResults.filter((board) =>
      [board.name, board.url, board.status, board.method, board.error ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [run, search]);

  const healthy = run !== null && run.failedBoards === 0;
  const pillColor = healthy
    ? "border-[#00574f] bg-[#002824] text-[#A4F002] hover:bg-[#004d45]"
    : "border-amber-500/50 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60";
  const dotColor = healthy ? "bg-[#A4F002]" : "bg-amber-400";
  const statusText = loading
    ? "Loading scrape health"
    : loadError
      ? "Scrape health unavailable"
      : run
        ? `${run.succeededBoards}/${run.totalBoards} boards healthy • Last synced ${formatLastSynced(run.createdAt)}`
        : "No scrape run yet";

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="scrape-health-drawer"
        title={loadError ?? statusText}
        className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-[11px] font-medium shadow-sm transition-colors ${pillColor}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <span className="truncate">{statusText}</span>
      </button>

      {portalRoot &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 ${
              isOpen ? "" : "pointer-events-none"
            }`}
            aria-hidden={!isOpen}
          >
            <button
              type="button"
              tabIndex={isOpen ? 0 : -1}
              aria-label="Close scrape diagnostics"
              onClick={() => setIsOpen(false)}
              className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity duration-300 ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
            />
            <aside
              id="scrape-health-drawer"
              role="dialog"
              aria-modal={isOpen}
              aria-labelledby="scrape-health-title"
              aria-hidden={!isOpen}
              inert={!isOpen}
              className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col rounded-l-2xl border-l border-[#00574f] bg-[#00403A] text-[#A4F002] shadow-2xl transition-transform duration-300 ${
                isOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-start justify-between gap-4 rounded-tl-2xl border-b border-[#00574f] bg-[#00332e]/95 px-5 py-5 backdrop-blur-md sm:px-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A4F002]/70">
                    Scraper diagnostics
                  </p>
                  <h2 id="scrape-health-title" className="mt-1 text-xl font-bold text-[#A4F002]">
                    Latest board health
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-[#00574f] bg-[#002824] px-3 py-1.5 text-sm text-[#A4F002]/80 transition-colors hover:bg-[#004d45] hover:text-[#A4F002]"
                >
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                {loading ? (
                  <p className="rounded-xl border border-[#00574f] bg-[#00332e]/70 p-4 text-sm text-[#A4F002]/70">
                    Loading the latest scrape run…
                  </p>
                ) : loadError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200"
                  >
                    Could not load scrape diagnostics: {loadError}
                  </p>
                ) : !run ? (
                  <p className="rounded-xl border border-[#00574f] bg-[#00332e]/70 p-4 text-sm text-[#A4F002]/70">
                    No scrape run has been reported yet.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryCard label="Succeeded" value={`${run.succeededBoards}/${run.totalBoards}`} color="emerald" />
                      <SummaryCard label="Failed" value={String(run.failedBoards)} color={run.failedBoards > 0 ? "rose" : "slate"} />
                      <SummaryCard label="New jobs found" value={String(run.newJobsFound)} color="sky" />
                      <SummaryCard label="Duration" value={formatDuration(run.durationMs)} color="slate" />
                    </div>
                    <p className="mt-3 text-xs text-[#A4F002]/60">
                      Last synced {formatLastSynced(run.createdAt)}
                    </p>

                    {failedBoards.length > 0 && (
                      <section className="mt-6">
                        <h3 className="mb-3 text-sm font-semibold text-rose-200">
                          Failed boards ({failedBoards.length})
                        </h3>
                        <div className="space-y-3">
                          {failedBoards.map((board, index) => (
                            <article
                              key={`${board.url}-${board.name}-${index}`}
                              className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4"
                            >
                              <a
                                href={board.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-sm font-semibold text-rose-100 underline decoration-rose-400/50 underline-offset-2 hover:text-white"
                              >
                                {board.name}
                              </a>
                              <p className="mt-2 break-words text-sm text-rose-200">
                                {board.error || "No error reason was reported."}
                              </p>
                              <div className="mt-3">
                                <MethodBadge method={board.method} />
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="mt-7">
                      <div className="sticky top-0 z-10 -mx-5 border-y border-[#00574f] bg-[#00403A]/95 px-5 py-3 backdrop-blur sm:-mx-7 sm:px-7">
                        <label
                          htmlFor="scrape-board-search"
                          className="mb-2 block text-sm font-semibold text-[#A4F002]"
                        >
                          All scanned boards ({filteredBoards.length}/{run.totalBoards})
                        </label>
                        <input
                          id="scrape-board-search"
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search board, URL, method, or error"
                          className="w-full rounded-lg border border-[#00574f] bg-[#002824] px-3 py-2 text-sm text-[#A4F002] outline-none placeholder:text-[#A4F002]/40 focus:border-[#A4F002]/70 focus:ring-2 focus:ring-[#A4F002]/20"
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        {filteredBoards.map((board, index) => (
                          <article
                            key={`${board.url}-${board.name}-${index}`}
                            className="flex flex-col gap-2 rounded-xl border border-[#00574f] bg-[#00332e]/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <a
                                href={board.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm font-medium text-[#A4F002] hover:text-white"
                              >
                                {board.name}
                              </a>
                              <span className="mt-1 block truncate text-xs text-[#A4F002]/50">
                                {board.url}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <MethodBadge method={board.method} />
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                  board.status === "ok"
                                    ? "border-[#00574f] bg-[#002824] text-[#A4F002]"
                                    : "border-rose-500/40 bg-rose-950/30 text-rose-200"
                                }`}
                              >
                                {board.status === "ok" ? "OK" : "Failed"}
                              </span>
                            </div>
                          </article>
                        ))}
                        {filteredBoards.length === 0 && (
                          <p className="rounded-xl border border-[#00574f] bg-[#00332e]/70 p-4 text-sm text-[#A4F002]/60">
                            No boards match this search.
                          </p>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </aside>
          </div>,
          portalRoot,
        )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "rose" | "sky" | "slate";
}) {
  const colorClasses = {
    emerald: "text-[#A4F002]",
    rose: "text-rose-300",
    sky: "text-[#A4F002]",
    slate: "text-[#A4F002]/90",
  };

  return (
    <div className="rounded-xl border border-[#00574f] bg-[#00332e]/70 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4F002]/60">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: ScrapeMethod }) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        method === "ats-json"
          ? "border-[#A4F002]/30 bg-[#A4F002]/10 text-[#A4F002]"
          : "border-[#00574f] bg-[#002824] text-[#A4F002]/70"
      }`}
    >
      {method === "ats-json" ? "ATS JSON" : "Browser"}
    </span>
  );
}
