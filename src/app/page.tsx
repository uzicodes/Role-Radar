import { prisma } from "@/lib/prisma";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function MatchScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;

  const isHigh = score >= 80;
  const isMedium = score >= 60 && score < 80;

  const badgeClasses = isHigh
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isMedium
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60";

  const dotClasses = isHigh
    ? "bg-emerald-400 animate-pulse"
    : isMedium
    ? "bg-amber-400"
    : "bg-zinc-400";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClasses}`}
      title={`AI Relevance Score: ${score}%`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      <span>{score}% Match</span>
    </div>
  );
}

export default async function HomePage() {
  // 1. Fetch all jobs from Neon PostgreSQL ordered by newest first
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const highMatchCount = jobs.filter((j) => (j.matchScore ?? 0) >= 80).length;
  const uniqueCompanies = new Set(jobs.map((j) => j.company)).size;

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#090a0f]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-black font-black text-lg">
              <svg
                className="w-5 h-5 text-white"
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
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  RoleRadar
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">Automated Career Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{jobs.length} roles on radar</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Metric Overview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Scraped</div>
            <div className="mt-1 text-2xl font-extrabold text-zinc-100">{jobs.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider">High Match (&ge; 80%)</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-400">{highMatchCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-cyan-400/90 uppercase tracking-wider">Companies Tracked</div>
            <div className="mt-1 text-2xl font-extrabold text-cyan-300">{uniqueCompanies}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Latest Ingestion</div>
            <div className="mt-1 text-sm sm:text-base font-semibold text-zinc-200 truncate">
              {jobs.length > 0 ? formatRelativeTime(jobs[0].createdAt) : "No activity"}
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Discovered Roles</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Aggregated opportunities extracted and scored via stealth browser pipelines.
            </p>
          </div>
        </div>

        {/* Job Cards Grid or Empty State */}
        {jobs.length === 0 ? (
          <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center backdrop-blur-sm">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 mb-4 shadow-inner">
              <svg
                className="w-8 h-8 text-cyan-400 animate-pulse"
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
            <h3 className="text-lg font-semibold text-zinc-200">No jobs detected on radar</h3>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Your radar database is currently empty. Run your standalone scraper to pull live postings from Greenhouse or Lever.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <code className="px-3.5 py-1.5 rounded-lg bg-black/80 border border-zinc-800 font-mono text-xs text-cyan-300">
                npm run scrape
              </code>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-cyan-950/20"
              >
                {/* Card Top: Company, Timestamp, Match Score */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-xs font-semibold tracking-wider uppercase text-cyan-400/90 truncate max-w-full">
                        {job.company}
                      </span>
                      <span className="mx-2 text-zinc-600 text-xs">•</span>
                      <span className="text-xs text-zinc-400" title={new Date(job.createdAt).toLocaleString()}>
                        {formatRelativeTime(job.createdAt)}
                      </span>
                    </div>
                    <MatchScoreBadge score={job.matchScore} />
                  </div>

                  {/* Job Title */}
                  <h2 className="text-lg font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                    {job.title}
                  </h2>

                  {/* Pills: Location & Salary */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                        <svg
                          className="w-3.5 h-3.5 text-zinc-400 shrink-0"
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate max-w-[180px]">{job.location}</span>
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
                        <span className="truncate max-w-[180px]">{job.salary}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Action Button */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide bg-zinc-800 hover:bg-cyan-500 hover:text-black text-zinc-100 border border-zinc-700/80 hover:border-cyan-400 transition-all duration-150 shadow-sm group/btn"
                  >
                    <span>View Application</span>
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
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
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        RoleRadar • Autonomous Career Crawler
      </footer>
    </div>
  );
}
