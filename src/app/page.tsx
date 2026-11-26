import { Suspense } from "react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import JobsInbox, { JobItem } from "@/components/JobsInbox";

function JobsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Filter & Inbox Header Bar Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 rounded-2xl bg-[#00332e]/50 border border-[#00574f]/50">
        <div className="lg:w-1/4 space-y-3">
          <div className="h-5 w-24 bg-[#004d45] rounded-full" />
          <div className="h-8 w-44 bg-[#004d45] rounded-lg" />
          <div className="h-16 w-full bg-[#002824] rounded-xl" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="h-64 w-full max-w-[320px] bg-[#004d45]/70 rounded-2xl" />
        </div>
        <div className="lg:w-1/4 flex flex-col lg:items-end gap-3">
          <div className="h-8 w-28 bg-[#002824] rounded-full border border-[#00574f]" />
          <div className="h-5 w-44 bg-[#002824] rounded" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-[#00574f]/50 bg-[#00332e]/40 p-4 space-y-3"
          >
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-[#004d45] rounded" />
                <div className="h-3 w-20 bg-[#004d45]/70 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-[#004d45] rounded" />
            </div>
            <div className="pt-2.5 border-t border-[#00574f]/40 flex justify-between items-center">
              <div className="h-6 w-24 bg-[#004d45] rounded-md" />
              <div className="h-6 w-20 bg-[#004d45] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function JobsContent() {
  // Fetch all jobs from Neon PostgreSQL ordered by newest first
  const jobs = (await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })) as JobItem[];

  return <JobsInbox jobs={jobs} />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#00403A] text-[#A4F002] flex flex-col font-sans selection:bg-[#A4F002]/30 selection:text-[#A4F002]">
      {/* Navigation Header */}
      <header className="sticky top-4 z-30 w-full px-4">
        <div className="max-w-5xl mx-auto h-16 px-5 sm:px-7 flex items-center justify-between rounded-full border border-[#00574f]/70 bg-[#00332e]/90 shadow-lg shadow-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="RoleRadar logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#A4F002]">
                RoleRadar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#002f2a] border border-[#00574f] text-[11px] font-mono uppercase tracking-wider text-[#A4F002]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A4F002] animate-pulse" />
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
      <footer className="flex items-center justify-center gap-2 w-full border-t border-[#00574f]/50 py-6 text-center text-xs text-[#A4F002]/70">
        <Image
          src="/logo.webp"
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
        />
        <span>RoleRadar • Automated Career Intelligence</span>
      </footer>
    </div>
  );
}
