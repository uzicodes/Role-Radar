import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type IncomingJob = Record<string, unknown> & {
  experienceRequired?: string | null;
};

interface ScrapeBoardResult {
  name: string;
  url: string;
  status: 'ok' | 'error';
  method: 'ats-json' | 'browser';
  jobsFound: number;
  error?: string;
}

interface IncomingScrapeStats {
  totalBoards: number;
  succeededBoards: number;
  failedBoards: number;
  newJobsFound: number;
  durationMs: number;
  boardResults: ScrapeBoardResult[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIncomingJob(job: unknown): job is IncomingJob {
  if (typeof job !== 'object' || job === null || Array.isArray(job)) {
    return false;
  }

  const experienceRequired = (job as Record<string, unknown>).experienceRequired;
  return (
    experienceRequired === undefined ||
    experienceRequired === null ||
    typeof experienceRequired === 'string'
  );
}

function normalizeExperienceRequired(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  if (['', 'n/a', 'not mentioned', 'none'].includes(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isScrapeBoardResult(value: unknown): value is ScrapeBoardResult {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.url === 'string' &&
    (value.status === 'ok' || value.status === 'error') &&
    (value.method === 'ats-json' || value.method === 'browser') &&
    isNonNegativeInteger(value.jobsFound) &&
    (value.error === undefined || typeof value.error === 'string')
  );
}

function isIncomingScrapeStats(value: unknown): value is IncomingScrapeStats {
  if (!isRecord(value) || !Array.isArray(value.boardResults)) return false;
  if (!value.boardResults.every(isScrapeBoardResult)) return false;

  const succeededBoards = value.boardResults.filter((board) => board.status === 'ok').length;
  const failedBoards = value.boardResults.length - succeededBoards;

  return (
    isNonNegativeInteger(value.totalBoards) &&
    isNonNegativeInteger(value.succeededBoards) &&
    isNonNegativeInteger(value.failedBoards) &&
    isNonNegativeInteger(value.newJobsFound) &&
    isNonNegativeInteger(value.durationMs) &&
    value.totalBoards === value.boardResults.length &&
    value.succeededBoards === succeededBoards &&
    value.failedBoards === failedBoards &&
    value.newJobsFound === value.boardResults.reduce((total, board) => total + board.jobsFound, 0)
  );
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate the incoming request from your scraper / GitHub Action
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized scraper access' }, { status: 401 });
    }

    // 2. Parse job and optional scrape health payloads
    const payload: unknown = await req.json();
    if (!isRecord(payload)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const jobs = payload.jobs === undefined ? [] : payload.jobs;
    const scrapeStats =
      payload.scrapeStats === undefined ? undefined : payload.scrapeStats;

    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: 'Jobs must be an array' }, { status: 400 });
    }
    if (jobs.length === 0 && scrapeStats === undefined) {
      return NextResponse.json({ message: 'No jobs found in payload' }, { status: 400 });
    }

    if (!jobs.every(isIncomingJob)) {
      return NextResponse.json(
        { error: 'Invalid experienceRequired value in job payload' },
        { status: 400 },
      );
    }

    if (scrapeStats !== undefined && !isIncomingScrapeStats(scrapeStats)) {
      return NextResponse.json({ error: 'Invalid scrapeStats payload' }, { status: 400 });
    }

    let added = 0;
    if (jobs.length > 0) {
      // Generate date string in 'Asia/Dhaka' timezone (e.g., "Nov 10 2026")
      const dhakaParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).formatToParts(new Date());

      const month = dhakaParts.find((p) => p.type === 'month')?.value || '';
      const day = dhakaParts.find((p) => p.type === 'day')?.value || '';
      const year = dhakaParts.find((p) => p.type === 'year')?.value || '';
      const currentDhakaDate = `${month} ${day} ${year}`.trim();

      const newJobs = jobs.map((job: IncomingJob) => ({
        title: String(job.title),
        company: String(job.company),
        location: job.location ? String(job.location) : null,
        salary: job.salary ? String(job.salary) : null,
        experienceRequired: normalizeExperienceRequired(job.experienceRequired),
        link: String(job.link),
        matchScore:
          job.matchScore !== null && job.matchScore !== undefined
            ? Number(job.matchScore)
            : null,
        scrapedDate: currentDhakaDate,
      }));

      const result = await prisma.job.createMany({
        data: newJobs,
        skipDuplicates: true,
      });
      added = result.count;
    }

    if (scrapeStats !== undefined) {
      const boardResults: Prisma.InputJsonObject[] = scrapeStats.boardResults.map((board) => ({
        name: board.name,
        url: board.url,
        status: board.status,
        method: board.method,
        jobsFound: board.jobsFound,
        ...(board.error === undefined ? {} : { error: board.error }),
      }));
      const pruneBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.scrapeRun.create({
          data: {
            totalBoards: scrapeStats.totalBoards,
            succeededBoards: scrapeStats.succeededBoards,
            failedBoards: scrapeStats.failedBoards,
            newJobsFound: scrapeStats.newJobsFound,
            durationMs: scrapeStats.durationMs,
            boardResults,
          },
        }),
        prisma.scrapeRun.deleteMany({
          where: { createdAt: { lt: pruneBefore } },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      received: jobs.length,
      added,
      scrapeRunRecorded: scrapeStats !== undefined,
    });
  } catch (error) {
    console.error('Job Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error during sync' }, { status: 500 });
  }
}
