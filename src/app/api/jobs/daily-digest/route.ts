import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(request: Request) {
  try {
    // 1. Security Check: Authenticate via Bearer CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Calculate today's date in 'Asia/Dhaka' timezone (matches format "MMM D YYYY", e.g. "Nov 10 2026")
    const dhakaParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).formatToParts(new Date());

    const month = dhakaParts.find((p) => p.type === 'month')?.value || '';
    const day = dhakaParts.find((p) => p.type === 'day')?.value || '';
    const year = dhakaParts.find((p) => p.type === 'year')?.value || '';
    const todayDhakaDate = `${month} ${day} ${year}`.trim();

    // 3. Query Prisma for all jobs synced today, ordered by newest first
    const jobs = await prisma.job.findMany({
      where: {
        scrapedDate: todayDhakaDate,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 4. If no jobs were found for today, skip sending email
    if (jobs.length === 0) {
      return NextResponse.json({ message: 'No jobs synced today. Skipping email.' });
    }

    // 5. Verify Resend credentials
    const resendApiKey = process.env.RESEND_API_KEY;
    const alertEmail = process.env.ALERT_EMAIL;

    if (!resendApiKey || !alertEmail) {
      console.error('RESEND_API_KEY or ALERT_EMAIL environment variable is missing.');
      return NextResponse.json(
        { error: 'Email service is not configured (missing RESEND_API_KEY or ALERT_EMAIL)' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // 6. Construct sleek, dark-themed HTML email template
    const jobsListHtml = jobs
      .map((job) => {
        const titleSafe = escapeHtml(job.title);
        const companySafe = escapeHtml(job.company);
        const locationSafe = job.location ? escapeHtml(job.location) : null;
        const salarySafe = job.salary ? escapeHtml(job.salary) : null;

        return `
          <div style="background-color: #161822; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-bottom: 14px;">
            <div style="margin-bottom: 10px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                <tr>
                  <td style="text-align: left; vertical-align: middle;">
                    <span style="font-size: 11px; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">
                      ${companySafe}
                    </span>
                  </td>
                  ${
                    job.matchScore
                      ? `
                  <td style="text-align: right; vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 9px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">
                      ${job.matchScore}% Match
                    </span>
                  </td>`
                      : ''
                  }
                </tr>
              </table>

              <h2 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #fafafa; line-height: 1.35;">
                ${titleSafe}
              </h2>

              <div style="font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${locationSafe ? `<span style="display: inline-block; margin-right: 12px;">📍 ${locationSafe}</span>` : ''}
                ${salarySafe ? `<span style="display: inline-block; color: #34d399; font-weight: 600;">💰 ${salarySafe}</span>` : ''}
              </div>
            </div>

            <div style="padding-top: 6px;">
              <a href="${job.link}" target="_blank" style="display: inline-block; background-color: #10b981; color: #090a0f; padding: 8px 16px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 12px;">
                View &amp; Apply &rarr;
              </a>
            </div>
          </div>
        `;
      })
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RoleRadar Daily Digest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #090a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
          <div style="max-width: 620px; margin: 0 auto; padding: 28px 16px;">
            <div style="background-color: #0f1117; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.5);">
              
              <!-- Header Banner -->
              <div style="padding: 24px 28px; background: linear-gradient(135deg, #131722 0%, #0d1117 100%); border-bottom: 1px solid #27272a;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981;">
                    Daily Intelligence Digest
                  </span>
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                  RoleRadar
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #a1a1aa;">
                  ${todayDhakaDate} &bull; <strong style="color: #10b981;">${jobs.length}</strong> ${jobs.length === 1 ? 'role' : 'roles'} captured today
                </p>
              </div>

              <!-- Job Postings List -->
              <div style="padding: 22px 24px 10px 24px;">
                ${jobsListHtml}
              </div>

              <!-- Footer -->
              <div style="padding: 18px 24px; background-color: #0b0c10; border-top: 1px solid #1f2028; text-align: center; color: #71717a; font-size: 11px; line-height: 1.6;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #a1a1aa;">RoleRadar &bull; Autonomous Career Crawler</p>
                <p style="margin: 0; color: #52525b;">Dispatched automatically once daily at 9:00 PM BST</p>
              </div>

            </div>
          </div>
        </body>
      </html>
    `;

    // 7. Send exactly ONE consolidated daily digest email via Resend
    const roleCountText = `${jobs.length} ${jobs.length === 1 ? 'Role' : 'Roles'} Found`;
    const emailSubject = `RoleRadar Daily Digest - ${todayDhakaDate} (${roleCountText})`;

    const sendResponse = await resend.emails.send({
      from: 'RoleRadar <onboarding@resend.dev>',
      to: alertEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      date: todayDhakaDate,
      count: jobs.length,
      emailId: sendResponse.data?.id,
    });
  } catch (error) {
    console.error('Daily Digest Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while compiling daily digest' },
      { status: 500 }
    );
  }
}
