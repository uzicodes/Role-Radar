import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Prevent creating multiple instances of Prisma in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    // 1. Authenticate the incoming request from your GitHub Action
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized scraper access' }, { status: 401 });
    }

    // 2. Parse the JSON array of jobs sent by Mistral AI
    const { jobs } = await req.json();

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ message: 'No jobs found in payload' }, { status: 400 });
    }

    // 3. Bulk insert to Neon PostgreSQL, ignoring duplicate URLs
    const result = await prisma.job.createMany({
      data: jobs.map((job) => ({
        title: String(job.title),
        company: String(job.company),
        location: job.location ? String(job.location) : null,
        salary: job.salary ? String(job.salary) : null,
        link: String(job.link),
        matchScore: job.matchScore ? Number(job.matchScore) : null,
      })),
      skipDuplicates: true, // Silently skips jobs where the URL already exists
    });

    return NextResponse.json({ 
      success: true, 
      received: jobs.length, 
      added: result.count 
    });

  } catch (error) {
    console.error('Job Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error during sync' }, { status: 500 });
  }
}