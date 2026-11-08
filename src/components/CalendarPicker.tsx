"use client";

import { useState, useMemo } from "react";

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  datesWithJobs?: Set<string>; // Set of "MMM D YYYY" formatted strings
}

function formatYMD(year: number, monthIndex: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDbDateString(dateInput: string) {
  if (!dateInput) return "";
  const [year, month, day] = dateInput.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStr = months[parseInt(month, 10) - 1];
  const dayStr = parseInt(day, 10).toString(); // Removes leading zeros (e.g., "08" -> "8")
  return `${monthStr} ${dayStr} ${year}`;
}

export const parseYMDToScrapedDate = getDbDateString;

export function getTodayYMD(): string {
  const now = new Date();
  return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarPicker({
  selectedDate,
  onSelectDate,
  datesWithJobs,
}: CalendarPickerProps) {
  // Selected date parsed values
  const [selYear, selMonth] = useMemo(() => {
    const parts = (selectedDate || getTodayYMD()).split("-").map(Number);
    return [parts[0], parts[1] - 1, parts[2]];
  }, [selectedDate]);

  // User navigated month/year state (null means match selected date's month/year)
  const [navYearMonth, setNavYearMonth] = useState<{ year: number; month: number } | null>(null);

  const viewYear = navYearMonth ? navYearMonth.year : selYear;
  const viewMonth = navYearMonth ? navYearMonth.month : selMonth;

  const todayYMD = getTodayYMD();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setNavYearMonth({ year: viewYear - 1, month: 11 });
    } else {
      setNavYearMonth({ year: viewYear, month: viewMonth - 1 });
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setNavYearMonth({ year: viewYear + 1, month: 0 });
    } else {
      setNavYearMonth({ year: viewYear, month: viewMonth + 1 });
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  return (
    <div className="w-full max-w-[320px] rounded-2xl bg-neutral-900/90 border border-neutral-800 p-4 shadow-xl backdrop-blur-md">
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-800">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none"
          title="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-xs sm:text-sm font-semibold text-neutral-100 tracking-wide">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none"
          title="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAY_LABELS.map((day) => (
          <span key={day} className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-0.5">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Blank offset tiles for previous month */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`blank-${idx}`} className="h-7 w-full" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateYmd = formatYMD(viewYear, viewMonth, day);
          const isSelected = dateYmd === selectedDate;
          const isToday = dateYmd === todayYMD;

          // Check if jobs exist on this day
          const scrapedKey = getDbDateString(dateYmd);
          const hasJobs = datesWithJobs ? datesWithJobs.has(scrapedKey) : false;

          let btnStyles = "text-neutral-300 hover:bg-neutral-800 hover:text-white";

          if (isSelected) {
            btnStyles = "bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/25";
          } else if (isToday) {
            btnStyles = "border border-emerald-500/50 text-emerald-400 font-semibold hover:bg-emerald-500/10";
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                onSelectDate(dateYmd);
                setNavYearMonth(null);
              }}
              className={`relative flex flex-col items-center justify-center h-7 w-full rounded-md text-xs font-medium transition-all focus:outline-none ${btnStyles}`}
            >
              <span>{day}</span>
              {/* Indicator dot if jobs were synced on this date */}
              {hasJobs && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isSelected ? "bg-neutral-950" : "bg-emerald-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Legend */}
      <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Synced roles</span>
        </div>

        {selectedDate !== todayYMD && (
          <button
            type="button"
            onClick={() => {
              onSelectDate(todayYMD);
              setNavYearMonth(null);
            }}
            className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
          >
            Today
          </button>
        )}
      </div>
    </div>
  );
}
