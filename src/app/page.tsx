import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function MatchScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;

  let colorClasses = "bg-rose-500/15 text-rose-400 border-rose-500/30";
  let dotColor = "bg-rose-400";

  if (score >= 80) {
    colorClasses = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    dotColor = "bg-emerald-400";
  } else if (score >= 60) {
    colorClasses = "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    dotColor = "bg-yellow-400";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{score}% Match</span>
    </div>
  );
}

function JobsSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-neutral-800/70 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-neutral-900 rounded animate-pulse" />
        </div>
        <div className="h-7 w-32 bg-neutral-900 rounded-full border border-neutral-800 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-5 space-y-4 animate-pulse"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 bg-neutral-800 rounded" />
                <div className="h-5 w-20 bg-neutral-800 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-neutral-800 rounded" />
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-20 bg-neutral-800/70 rounded-md" />
                <div className="h-6 w-24 bg-neutral-800/70 rounded-md" />
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-800/60 flex justify-between items-center">
              <div className="h-3.5 w-28 bg-neutral-800 rounded" />
              <div className="h-7 w-24 bg-neutral-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function JobsContent() {
  // Fetch all jobs from Neon PostgreSQL (newest first)
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <>
      {/* Title & Count Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Discovered Roles
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Real-time opportunities detected and matched from company job boards.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
          </span>
        </span>
      </div>

      {jobs.length === 0 ? (
        /* Empty State */
        <div className="my-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 mb-4 shadow-inner text-emerald-400">
            <svg
              className="w-8 h-8 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-200">
            No jobs found
          </h3>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            Your radar database is currently empty. Run the scraper to populate your dashboard with fresh postings.
          </p>
          <div className="mt-6">
            <code className="px-4 py-2 rounded-lg bg-black border border-neutral-800 font-mono text-xs text-emerald-400">
              npm run scrape
            </code>
          </div>
        </div>
      ) : (
        /* Responsive Job Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-900"
            >
              {/* Card Header & Content */}
              <div>
                {/* Top row: Company & Match Score Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 truncate">
                    {job.company}
                  </span>
                  <MatchScoreBadge score={job.matchScore} />
                </div>

                {/* Job Title */}
                <h3 className="text-lg font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                  {job.title}
                </h3>

                {/* Location & Salary Badges */}
                {(job.location || job.salary) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                        <svg
                          className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="truncate max-w-[170px]">{job.location}</span>
                      </span>
                    )}

                    {job.salary && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                        <svg
                          className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="truncate max-w-[170px]">{job.salary}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Timestamp & Action Button */}
              <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-3">
                <span
                  className="text-xs text-neutral-400 font-mono truncate"
                  suppressHydrationWarning
                  title={new Date(job.createdAt).toISOString()}
                >
                  {formatDate(job.createdAt)}
                </span>

                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm shrink-0"
                >
                  <span>View Role</span>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-neutral-950 shadow-lg shadow-emerald-500/20">
              <svg
                className="w-5 h-5 text-neutral-950"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <circle cx="12" cy="12" r="9" className="opacity-40" />
                <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                RoleRadar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Pipeline</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content Streamed via Suspense */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Suspense fallback={<JobsSkeleton />}>
          <JobsContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-6 text-center text-xs text-neutral-400">
        RoleRadar • Automated Career Intelligence
      </footer>
    </div>
  );
}
