"use client";

import { useState, useMemo } from "react";
import CalendarPicker, { getTodayYMD, getDbDateString } from "./CalendarPicker";

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  link: string;
  matchScore: number | null;
  isRead: boolean;
  scrapedDate?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface JobsInboxProps {
  jobs: JobItem[];
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function JobsInbox({ jobs }: JobsInboxProps) {
  // 1. State for selected calendar date (YYYY-MM-DD format) defaulting to today
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayYMD());

  // 2. Format selected date into "MMM D YYYY" (e.g. "Nov 8 2026") using pure string manipulation
  const formattedSelectedDate = getDbDateString(selectedDate);

  // 3. Collect unique scrapedDate strings from the jobs database for calendar indicators
  const datesWithJobs = useMemo(() => {
    const dates = new Set<string>();
    for (const job of jobs) {
      if (job.scrapedDate) {
        dates.add(job.scrapedDate);
      }
    }
    return dates;
  }, [jobs]);

  // 4. Filter jobs: only render jobs where job.scrapedDate exactly matches formattedSelectedDate
  const filteredJobs = jobs.filter((job) => job.scrapedDate === formattedSelectedDate);

  const isToday = selectedDate === getTodayYMD();

  return (
    <div className="space-y-8">
      {/* Top Filter & Inbox Header Bar with Always-Open Inline Calendar in the Middle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/90 shadow-xl backdrop-blur-md">
        {/* Left Section: Context & Active Date Overview */}
        <div className="lg:w-1/4 flex-shrink-0 space-y-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Daily Inbox</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5">
              RoleRadar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Select any day on the calendar to explore tech roles captured on that specific date.
          </p>

          <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 shadow-inner">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500">
              Viewing Date
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {formattedSelectedDate || selectedDate}
            </div>
          </div>
        </div>

        {/* Middle Section: Always Open Inline Calendar */}
        <div className="flex justify-center items-center flex-1 my-2 lg:my-0">
          <CalendarPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            datesWithJobs={datesWithJobs}
          />
        </div>

        {/* Right Section: Stats, Legend & Actions */}
        <div className="lg:w-1/4 flex-shrink-0 flex flex-col lg:items-end justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {filteredJobs.length} {filteredJobs.length === 1 ? "role" : "roles"} found
              </span>
            </span>
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayYMD())}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-xs font-medium text-emerald-400 border border-neutral-700/80 transition-colors shadow-sm"
              title="Reset to today's date"
            >
              Reset to Today
            </button>
          )}

          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Green dots show dates with synced jobs</span>
          </div>
        </div>
      </div>

      {/* Filtered Jobs Grid or Fallback Message */}
      {filteredJobs.length === 0 ? (
        /* Empty State for Selected Date */
        <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 mb-4 shadow-inner text-neutral-500">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-200">
            No jobs synced on this date.
          </h3>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            No opportunities were recorded for{" "}
            <span className="text-neutral-300 font-medium">{formattedSelectedDate || selectedDate}</span>. Select a
            different date from the calendar or run the scraper.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <code className="px-3.5 py-1.5 rounded-lg bg-black/80 border border-neutral-800 font-mono text-xs text-emerald-400">
              npm run scrape
            </code>
          </div>
        </div>
      ) : (
        /* Responsive CSS Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="group flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-900"
            >
              {/* Card Header & Content */}
              <div>
                {/* Top row: Location */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-emerald-400/90 truncate">
                    <svg
                      className="w-3 h-3 text-emerald-400/80 shrink-0"
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
                    <span className="truncate">{job.location || "Location N/A"}</span>
                  </span>
                </div>

                {/* Job Title */}
                <h3 className="text-lg font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                  {job.title}
                </h3>

                {/* Company & Salary Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.company && (
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
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span className="truncate max-w-[170px] font-semibold text-neutral-200">{job.company}</span>
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
    </div>
  );
}
