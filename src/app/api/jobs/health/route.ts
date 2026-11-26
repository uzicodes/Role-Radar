import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const latestRun = await prisma.scrapeRun.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(latestRun, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Scrape Health Error:', error);
    return NextResponse.json({ error: 'Unable to load scrape health' }, { status: 500 });
  }
}
