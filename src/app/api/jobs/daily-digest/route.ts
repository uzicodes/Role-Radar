import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import {
  categorizeJobRole,
  ROLE_CATEGORIES,
  type RoleCategory,
} from "@/lib/categorizeRole";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(request: Request) {
  try {
    // 1. Authentication Check: Validate Bearer CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[Daily Digest] Server error: CRON_SECRET is not configured in environment variables.",
      );
      return NextResponse.json(
        { error: "Unauthorized: CRON_SECRET not configured" },
        { status: 401 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn(
        `[Daily Digest] Unauthorized access attempt with invalid or missing token.`,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Date String Formatting: Format today's date in 'Asia/Dhaka' timezone as "MMM D YYYY" (e.g., "Nov 12 2026")
    const dhakaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).formatToParts(new Date());

    const month = dhakaParts.find((p) => p.type === "month")?.value || "";
    const day = dhakaParts.find((p) => p.type === "day")?.value || "";
    const year = dhakaParts.find((p) => p.type === "year")?.value || "";
    const todayString = `${month} ${day} ${year}`.trim();

    console.log(
      `[Daily Digest] Running daily digest for date: "${todayString}"`,
    );

    // 3. Database Query: Fetch all jobs synced today, newest first
    const jobs = await prisma.job.findMany({
      where: {
        scrapedDate: todayString,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `[Daily Digest] Queried database for scrapedDate="${todayString}". Found ${jobs.length} job(s).`,
    );

    // 4. Verify Resend environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    const alertEmail = process.env.ALERT_EMAIL;

    if (!resendApiKey || !alertEmail) {
      console.error(
        `[Daily Digest] Configuration missing: RESEND_API_KEY present: ${Boolean(resendApiKey)}, ALERT_EMAIL present: ${Boolean(alertEmail)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Email service not configured (missing RESEND_API_KEY or ALERT_EMAIL)",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(resendApiKey);

    // 5. Construct sleek, dark-themed HTML email template
    type Job = (typeof jobs)[number];
    const groupedJobs: Record<RoleCategory, Job[]> = {
      All: [],
      "Full-Stack": [],
      Frontend: [],
      Backend: [],
      "AI / ML & Data": [],
      "DevOps & Cloud": [],
      "QA & Testing": [],
      "Other Roles": [],
    };

    for (const job of jobs) {
      groupedJobs[categorizeJobRole(job.title)].push(job);
    }

    const nonEmptyCategories = ROLE_CATEGORIES.filter(
      (category): category is Exclude<RoleCategory, "All"> =>
        category !== "All" && groupedJobs[category].length > 0,
    );
    const categorySummary = nonEmptyCategories
      .map((category) => `${category}: ${groupedJobs[category].length}`)
      .join(" &bull; ");

    const jobsListHtml =
      jobs.length > 0
        ? nonEmptyCategories
            .map((category) => {
              const categoryJobs = groupedJobs[category];
              const categoryJobsHtml = categoryJobs
                .map((job) => {
                  const titleSafe = escapeHtml(job.title);
                  const companySafe = escapeHtml(job.company);
                  const locationSafe = job.location
                    ? escapeHtml(job.location)
                    : null;
                  const experienceRequiredSafe = job.experienceRequired?.trim()
                    ? escapeHtml(job.experienceRequired.trim())
                    : null;
                  const linkSafe = escapeHtml(job.link);
                  const detailsHtml =
                    locationSafe || experienceRequiredSafe
                      ? `<div style="font-size: 12px; color: #cbd5e1;">${locationSafe ?? ""}${locationSafe && experienceRequiredSafe ? " &bull; " : ""}${experienceRequiredSafe ? `<span style="display: inline-block; background-color: rgba(56,189,248,0.12); color: #7dd3fc; border: 1px solid rgba(56,189,248,0.3); border-radius: 9999px; padding: 2px 7px; font-size: 11px;">${experienceRequiredSafe}</span>` : ""}</div>`
                      : "";

                  return `
                    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 12px;">
                      <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #38bdf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
                          ${companySafe}
                        </div>
                        <h3 style="margin: 0 0 8px 0; font-size: 17px; line-height: 1.35;">
                          <a href="${linkSafe}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; font-weight: 700; text-decoration: none;">
                            ${titleSafe}
                          </a>
                        </h3>
                        ${detailsHtml}
                      </div>
                      <a href="${linkSafe}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #38bdf8; color: #0f172a; padding: 8px 16px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 12px;">
                        View Role &rarr;
                      </a>
                    </div>
                  `;
                })
                .join("");

              return `
                <div style="margin: 18px 0 8px 0;">
                  <div style="display: table; width: 100%; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px;">
                    <span style="display: table-cell; color: #38bdf8; font-size: 16px; font-weight: 800;">
                      ${category}
                    </span>
                    <span style="display: table-cell; width: 1%; text-align: right;">
                      <span style="display: inline-block; background-color: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.35); border-radius: 9999px; padding: 3px 9px; font-size: 11px; font-weight: 800;">
                        ${categoryJobs.length}
                      </span>
                    </span>
                  </div>
                  ${categoryJobsHtml}
                </div>
              `;
            })
            .join("")
        : `
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 14px; text-align: center;">
            <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.35;">
              No new jobs found today
            </h2>
            <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
              All career boards were scanned successfully, and no new matching listings were posted for ${todayString}.
            </p>
          </div>
        `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RoleRadar Daily Digest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #38bdf8;">
          <div style="max-width: 620px; margin: 0 auto; padding: 28px 16px;">
            <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.5);">
              
              <!-- Header Banner -->
              <div style="padding: 24px 28px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8;">
                    Daily Intelligence Digest
                  </span>
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px;">
                  RoleRadar
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #cbd5e1;">
                  ${todayString} &bull; <strong style="color: #38bdf8;">${jobs.length}</strong> ${jobs.length === 1 ? "role" : "roles"} captured today
                </p>
                ${jobs.length > 0 ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">${categorySummary}</p>` : ""}
              </div>

              <!-- Digest Status -->
              <div style="padding: 22px 24px 10px 24px;">
                ${jobsListHtml}
              </div>

              <!-- Footer -->
              <div style="padding: 18px 24px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #38bdf8;">RoleRadar &bull; Autonomous Career Crawler</p>
                <p style="margin: 0; color: #94a3b8;">Dispatched automatically once daily at 9:00 PM BST</p>
              </div>

            </div>
          </div>
        </body>
      </html>
    `;

    // 6. Email Execution & Error Handling with Diagnostic Logging
    const subject =
      jobs.length > 0
        ? `RoleRadar Daily Digest - ${todayString} (${jobs.length} New Roles)`
        : `RoleRadar Daily Digest - ${todayString} (0 New Roles Today)`;
    console.log(
      `[Daily Digest] Sending digest email to "${alertEmail}" with subject: "${subject}"...`,
    );

    const { data, error: resendError } = await resend.emails.send({
      from: "RoleRadar <onboarding@resend.dev>",
      to: alertEmail,
      subject,
      html: emailHtml,
    });

    if (resendError) {
      console.error("[Daily Digest] Resend API Error returned:", resendError);
      return NextResponse.json(
        {
          success: false,
          error: resendError.message,
          name: resendError.name,
        },
        { status: 500 },
      );
    }

    console.log(
      `[Daily Digest] ${jobs.length > 0 ? "Digest" : "No-new-jobs status"} email sent successfully. Resend ID: ${data?.id}`,
    );

    return NextResponse.json({
      success: true,
      message:
        jobs.length > 0
          ? "Digest email sent successfully"
          : "No new jobs found today; status email sent",
      count: jobs.length,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("[Daily Digest] Internal Server Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error while compiling daily digest",
      },
      { status: 500 },
    );
  }
}
