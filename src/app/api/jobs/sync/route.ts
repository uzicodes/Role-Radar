import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

// Initialize Resend with fallback to avoid crashes if env is not yet populated
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

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
    // Generate date string in 'Asia/Dhaka' timezone (e.g., "Nov 8 2026")
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

    const newJobs = jobs.map((job: any) => ({
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

    // 4. Alert on all newly synced jobs
    const jobsToEmail = newJobs;

    // 5. Send email alert via Resend for all synced jobs
    if (jobsToEmail.length > 0) {
      try {
        if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL) {
          console.warn(
            '⚠️ New jobs detected, but RESEND_API_KEY or ALERT_EMAIL is missing. Skipping email alert.'
          );
        } else {
          // Construct HTML email body
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #090a0f; color: #ededed; border-radius: 12px; border: 1px solid #27272a;">
              <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 20px;">
                <h1 style="color: #10b981; margin: 0; font-size: 22px; font-weight: 700;">RoleRadar Alert</h1>
                <p style="color: #a1a1aa; margin: 6px 0 0 0; font-size: 14px;">
                  We found <strong>${jobsToEmail.length}</strong> new ${jobsToEmail.length === 1 ? 'job' : 'jobs'} on your radar!
                </p>
              </div>
              
              <div style="margin-bottom: 20px;">
                ${jobsToEmail
                  .map(
                    (job) => `
                  <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                    <div style="margin-bottom: 8px;">
                      <h2 style="color: #fafafa; margin: 0 0 4px 0; font-size: 17px; font-weight: 600;">${job.title}</h2>
                      <span style="color: #10b981; font-weight: 600; font-size: 13px; text-transform: uppercase;">${job.company}</span>
                      ${job.location ? `<span style="color: #71717a; font-size: 13px;"> &bull; ${job.location}</span>` : ''}
                      ${job.salary ? `<span style="color: #34d399; font-size: 13px;"> &bull; ${job.salary}</span>` : ''}
                    </div>
                    ${
                      job.matchScore
                        ? `
                    <div style="margin-bottom: 12px;">
                      <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #34d399; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">
                        ${job.matchScore}% Match
                      </span>
                    </div>`
                        : ''
                    }
                    <div>
                      <a href="${job.link}" target="_blank" style="display: inline-block; background-color: #10b981; color: #090a0f; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px;">View Application &rarr;</a>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>

              <div style="border-top: 1px solid #27272a; padding-top: 12px; text-align: center; color: #71717a; font-size: 11px;">
                RoleRadar &bull; Autonomous Career Crawler
              </div>
            </div>
          `;

          await resend.emails.send({
            from: 'RoleRadar <onboarding@resend.dev>',
            to: process.env.ALERT_EMAIL,
            subject: `RoleRadar: Found ${jobsToEmail.length} New ${jobsToEmail.length === 1 ? 'Job' : 'Jobs'}!`,
            html: emailHtml,
          });

          console.log(`✉️ Email alert sent to ${process.env.ALERT_EMAIL} for ${jobsToEmail.length} job(s).`);
        }
      } catch (emailError) {
        console.error('Failed to send Resend email alert:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      received: jobs.length, 
      added: result.count,
      emailed: jobsToEmail.length,
    });

  } catch (error) {
    console.error('Job Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error during sync' }, { status: 500 });
  }
}
