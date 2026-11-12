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

function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getCity(location: string | null): string {
  if (!location) return "Remote";
  const city = location.split(/[,/]/)[0]?.trim();
  return city || "Remote";
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
    <div className="space-y-8 text-[#A4F002]">
      {/* Top Filter & Inbox Header Bar with Always-Open Inline Calendar in the Middle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 rounded-2xl bg-[#00332e]/70 border border-[#00574f]/80 shadow-2xl backdrop-blur-md">
        {/* Left Section: Context & Active Date Overview */}
        <div className="lg:w-1/4 flex-shrink-0 space-y-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#002824] border border-[#00574f] text-[10px] font-mono uppercase tracking-wider text-[#A4F002]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A4F002] animate-pulse" />
              <span>Daily Inbox</span>
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#002824]/90 border border-[#00574f]/80 shadow-inner">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#A4F002]/60">
              Viewing Date
            </div>
            <div className="text-sm font-bold text-[#A4F002] mt-0.5">
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
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#002824] border border-[#00574f] text-xs font-mono text-[#A4F002] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#A4F002] animate-pulse" />
              <span>
                {filteredJobs.length} {filteredJobs.length === 1 ? "role" : "roles"} found
              </span>
            </span>
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayYMD())}
              className="px-3.5 py-1.5 rounded-xl bg-[#002824] hover:bg-[#004d45] text-xs font-semibold text-[#A4F002] border border-[#00574f] transition-colors shadow-sm"
              title="Reset to today's date"
            >
              Reset to Today
            </button>
          )}

          <div className="text-[11px] text-[#A4F002]/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A4F002]" />
            <span>Green dots show dates with synced jobs</span>
          </div>
        </div>
      </div>

      {/* Filtered Jobs Grid or Fallback Message */}
      {filteredJobs.length === 0 ? (
        /* Empty State for Selected Date */
        <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#00574f]/70 bg-[#00332e]/40 p-12 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#002824] border border-[#00574f] mb-4 shadow-inner text-[#A4F002]/70">
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
          <h3 className="text-lg font-bold text-[#A4F002]">
            No jobs synced on this date.
          </h3>
          <p className="mt-2 max-w-md text-sm text-[#A4F002]/70">
            No opportunities were recorded for{" "}
            <span className="text-[#A4F002] font-semibold">{formattedSelectedDate || selectedDate}</span>. Select a
            different date from the calendar or run the scraper.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <code className="px-3.5 py-1.5 rounded-lg bg-[#002420] border border-[#00574f] font-mono text-xs text-[#A4F002]">
              npm run scrape
            </code>
          </div>
        </div>
      ) : (
        /* Responsive CSS Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="group flex flex-col justify-between rounded-xl border border-[#00574f]/80 bg-[#00332e]/70 p-4 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A4F002]/70 hover:bg-[#003833]"
            >
              <div>
                {/* Top row: City Location (Left) & Time (Right) */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-[#A4F002]/90 truncate">
                    <svg
                      className="w-3 h-3 text-[#A4F002] shrink-0"
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
                    <span className="truncate">{getCity(job.location)}</span>
                  </span>

                  <span
                    className="text-[11px] text-[#A4F002]/60 font-mono shrink-0"
                    suppressHydrationWarning
                    title={new Date(job.createdAt).toISOString()}
                  >
                    {formatTime(job.createdAt)}
                  </span>
                </div>

                {/* Job Title */}
                <h3 className="text-base font-bold text-white group-hover:text-[#A4F002] transition-colors line-clamp-2 leading-snug mb-3">
                  {job.title}
                </h3>
              </div>

              {/* Bottom Row: Company & Salary (Left) & View Role Button (Right) */}
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#00574f]/50">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {job.company && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#002622] text-[#A4F002] border border-[#00574f] min-w-0 max-w-full">
                      <svg
                        className="w-3 h-3 text-[#A4F002]/80 shrink-0"
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
                      <span className="truncate">{job.company}</span>
                    </span>
                  )}

                  {job.salary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#002622] text-[#A4F002] border border-[#00574f] shrink-0">
                      <svg
                        className="w-3 h-3 text-[#A4F002]/80 shrink-0"
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
                      <span className="truncate max-w-[100px]">{job.salary}</span>
                    </span>
                  )}
                </div>

                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold bg-[#A4F002] hover:bg-[#b7ff1f] text-[#00403A] transition-all shadow-md shrink-0 active:scale-95 ml-auto"
                >
                  <span>View Role</span>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
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
