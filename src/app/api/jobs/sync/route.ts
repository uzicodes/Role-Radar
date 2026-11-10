import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // 1. Authenticate the incoming request from your scraper / GitHub Action
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized scraper access' }, { status: 401 });
    }

    // 2. Parse the JSON array of jobs sent by the scraper
    const { jobs } = await req.json();

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ message: 'No jobs found in payload' }, { status: 400 });
    }

    // 3. Format and bulk insert to Neon PostgreSQL, ignoring duplicate URLs
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

    const newJobs = jobs.map((job: Record<string, unknown>) => ({
      title: String(job.title),
      company: String(job.company),
      location: job.location ? String(job.location) : null,
      salary: job.salary ? String(job.salary) : null,
      link: String(job.link),
      matchScore:
        job.matchScore !== null && job.matchScore !== undefined
          ? Number(job.matchScore)
          : null,
      scrapedDate: currentDhakaDate,
    }));

    const result = await prisma.job.createMany({
      data: newJobs,
      skipDuplicates: true, // Silently skips jobs where the URL already exists
    });

    return NextResponse.json({ 
      success: true, 
      received: jobs.length, 
      added: result.count,
    });

  } catch (error) {
    console.error('Job Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error during sync' }, { status: 500 });
  }
}
