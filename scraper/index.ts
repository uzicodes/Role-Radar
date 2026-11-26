import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Groq from 'groq-sdk';
import { tryFetchAtsJobs, type RawScrapedJob } from './atsAdapter';
import { TARGET_URLS } from './targets';
import type { Browser, BrowserContext, Page } from 'patchright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.platform === 'win32') {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.pw-browsers');
}

const { chromium } = await import('patchright');

const ATS_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'jobs.lever.co',
  'jobs.ashbyhq.com',
  'apply.workable.com',
]);

function getBoardName(url: string): string {
  const parsedUrl = new URL(url);
  if (ATS_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    const slug = parsedUrl.pathname.split('/').filter(Boolean)[0];
    if (slug) return decodeURIComponent(slug);
  }
  return parsedUrl.hostname.replace(/^www\./i, '');
}

function formatAtsJobs(jobs: RawScrapedJob[]): string {
  return jobs
    .map((job, index) => {
      const lines = [
        `Job ${index + 1}: ${job.title} [LINK: ${job.link}]`,
        `Company: ${job.company}`,
        job.location ? `Location: ${job.location}` : null,
        job.department ? `Department: ${job.department}` : null,
        job.workType ? `Work type: ${job.workType}` : null,
        job.description ? `Description:\n${job.description}` : null,
      ];
      return lines.filter((line): line is string => line !== null).join('\n');
    })
    .join('\n\n');
}

// Interface matching the Prisma schema and Next.js /api/jobs/sync endpoint
interface ScrapedJob {
  title: string;
  company: string;
  location?: string | null;
  salary?: string | null;
  experienceRequired: string | null;
  link: string;
  matchScore?: number | null;
}

// Configuration from environment variables with sensible defaults
const CONFIG = {
  // Next.js API sync endpoint
  syncApiUrl: process.env.SYNC_API_URL || 'http://localhost:3000/api/jobs/sync',
  // Bearer authentication key for API access
  apiSecretKey: (process.env.API_SECRET_KEY || '').trim().replace(/^["']|["']$/g, ''),
  // Groq API Key
  groqApiKey: (process.env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, ''),
  // Groq model (defaults to openai/gpt-oss-120b)
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
};

async function runScraper(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🚀 RoleRadar Job Scraper starting up...');
  console.log(`📋 Total Job Boards Queued: ${TARGET_URLS.length}`);
  console.log('='.repeat(60));

  // 1. Validation checks
  if (!CONFIG.groqApiKey || CONFIG.groqApiKey === 'your_key_here') {
    console.error('❌ Missing or default GROQ_API_KEY in environment variables.');
    console.error('👉 Please set a valid GROQ_API_KEY in your scraper/.env file.');
    process.exit(1);
  }

  if (!CONFIG.apiSecretKey) {
    console.warn('⚠️  Warning: API_SECRET_KEY is empty. Sync request to /api/jobs/sync might return 401.');
  }

  // Resolve clean endpoint URL (automatically appending /api/jobs/sync if missing)
  const normalizedSyncUrl = (() => {
    const trimmed = (CONFIG.syncApiUrl || 'http://localhost:3000/api/jobs/sync')
      .trim()
      .replace(/\/+$/, '');
    return trimmed.endsWith('/api/jobs/sync') ? trimmed : `${trimmed}/api/jobs/sync`;
  })();

  console.log(`📡 Sync Endpoint:   ${normalizedSyncUrl}`);
  console.log(`🤖 AI Engine:       Groq (${CONFIG.groqModel})\n`);

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    const groq = new Groq({ apiKey: CONFIG.groqApiKey });

    // 3. Process each job board URL sequentially
    let completedCount = 0;
    let failedCount = 0;

    for (const url of TARGET_URLS) {
      console.log('\n' + '-'.repeat(60));
      console.log(`🎯 Processing Job Board [${completedCount + failedCount + 1}/${TARGET_URLS.length}]: ${url}`);
      console.log('-'.repeat(60));

      let page: Page | undefined;

      try {
        const board = { name: getBoardName(url), url };
        const atsResult = await tryFetchAtsJobs(board);
        let extractedContent: string;

        if (atsResult.handled) {
          console.log(`⚡ [ATS JSON] ${board.name}: fetched ${atsResult.jobs.length} postings`);
          if (atsResult.jobs.length === 0) {
            console.log(`ℹ️  No job postings found on ${url}. Skipping Groq extraction.`);
            completedCount++;
            continue;
          }
          extractedContent = formatAtsJobs(atsResult.jobs);
        } else {
          // Launch Chromium only when a board requires browser scraping.
          if (!browser) {
            console.log('🌐 Launching headless Chromium browser via Patchright...');
            browser = await chromium.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            context = await browser.newContext({
              viewport: { width: 1280, height: 800 },
              userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            });
          }

          if (!context) throw new Error('Patchright browser context was not initialized.');
          page = await context.newPage();

          // Navigate to target URL and wait for DOM content to load
          console.log(`⏳ Navigating to ${url}...`);
          const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          });

          console.log(`📄 Response status: ${response?.status() ?? 'N/A'}`);

          // Allow dynamic rendering for React/SPA sites (e.g. Pathao)
          await page.waitForTimeout(3000);

          // Wait for body to be available and visible
          await page.waitForSelector('body', { timeout: 15000 });

          // Extract visible body text and annotate links with their URLs (stripping boilerplate)
          console.log('🔍 Stripping boilerplate elements and extracting page content...');
          extractedContent = await page.evaluate(() => {
            // Remove boilerplate elements from the DOM (retaining nav and aside)
            document
              .querySelectorAll('header, footer, script, style, noscript, iframe')
              .forEach((el) => el.remove());

            // Annotate remaining anchor tags with their resolved URLs
            const anchors = document.querySelectorAll('a');
            anchors.forEach((a) => {
              const href = a.href;
              const text = a.textContent?.trim() || '';
              if (href && text) {
                a.textContent = `${text} [LINK: ${href}]`;
              }
            });

            return document.body?.innerText || '';
          });
        }

        console.log(`📊 Extracted ~${extractedContent.length} characters of text from page.`);

        if (!extractedContent || extractedContent.trim().length === 0) {
          throw new Error('Page body is empty or could not be extracted.');
        }

        // Truncate to 12,000 characters to stay comfortably under Groq's token limits
        const safeContent = extractedContent.slice(0, 12000);

        // Send extracted text to Groq API
        console.log(`🧠 Sending extracted content to Groq (${CONFIG.groqModel})...`);

        const systemPrompt = `You are an expert IT recruiter. Extract ALL technology and software-related job postings. This includes Software Engineering, Web Development, DevOps, QA/Testing, Mobile (iOS/Android), Data Science, AI/ML, UI/UX, and IT Infrastructure. Ignore non-technical roles like HR, Finance, or Sales.
Analyze the provided webpage content and extract all qualifying job postings into a single JSON object.
You MUST output ONLY a JSON object containing a "jobs" array.
Each job object in the array must strictly match this schema:
- "title": (string) Exact job title (e.g. "Software Engineer")
- "company": (string) Hiring company name (infer from context or domain)
- "location": (string or null) Job location (e.g. "Remote", "Dhaka, Bangladesh"), or null if not found
- "salary": (string or null) Salary or compensation range if mentioned, otherwise null
- "experienceRequired": (string or null) Extract a concise normalized requirement only when years of experience are explicitly stated in the job listing or snippet (e.g. "2+ yrs", "1-3 yrs", "3 yrs", "0-1 yrs"). Return null if no experience is required (e.g. "No experience required", "Freshers welcome") or if years are not mentioned. Never guess or infer from seniority titles alone.
- "link": (string) Direct job application or detail link. Use the link provided in "[LINK: ...]" next to the job title or button. If not found, use the target page URL.
- "matchScore": (number between 1 and 100 or null) Estimated relevance score based on tech/software engineering roles (e.g. 85 for software/dev roles, lower or null if general).

CRITICAL REQUIREMENT:
Output ONLY valid JSON. Do not include markdown code fences (\`\`\`json), explanations, or any conversational text outside the JSON.

Expected Format:
{
  "jobs": [
    {
      "title": "Senior Backend Engineer",
      "company": "Brain Station 23",
      "location": "Dhaka, Bangladesh",
      "salary": "BDT 120,000 - 150,000",
      "experienceRequired": "2+ yrs",
      "link": "https://brainstation-23.com/career/job-123",
      "matchScore": 90
    }
  ]
}`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Target URL: ${url}\n\nContent:\n${safeContent}` },
          ],
          model: CONFIG.groqModel,
          response_format: { type: 'json_object' },
        });

        const rawResponse = chatCompletion.choices?.[0]?.message?.content;
        if (!rawResponse) {
          throw new Error('Received an empty response from Groq API.');
        }

        // Parse JSON response safely
        console.log('📦 Parsing Groq JSON response...');
        let jobs: ScrapedJob[] = [];

        try {
          const cleanJson = (typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse))
            .replace(/```(?:json)?/gi, '')
            .replace(/```/g, '')
            .trim();

          const parsed = JSON.parse(cleanJson);
          jobs = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.jobs)
            ? parsed.jobs
            : [];
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response from Groq:', rawResponse);
          throw new Error(`JSON parsing failed: ${(parseError as Error).message}`);
        }

        console.log(`✅ Extracted ${jobs.length} job(s) from ${url}.`);

        // If jobs were found, POST to Next.js sync endpoint
        if (jobs.length > 0) {
          // Preview sample in console
          console.log('\n--- Jobs Sample ---');
          jobs.slice(0, 3).forEach((job, idx) => {
            console.log(`[${idx + 1}] ${job.title} | ${job.company} (${job.location || 'N/A'})`);
            console.log(`    Link: ${job.link}`);
            if (job.salary) console.log(`    Salary: ${job.salary}`);
            if (job.matchScore) console.log(`    Match Score: ${job.matchScore}`);
          });
          if (jobs.length > 3) console.log(`... and ${jobs.length - 3} more.`);
          console.log('-------------------\n');

          console.log(`📤 Sending ${jobs.length} job(s) to ${normalizedSyncUrl}...`);
          const maxSyncAttempts = 3;
          let syncResponse: Response | undefined;

          for (let attempt = 1; attempt <= maxSyncAttempts; attempt++) {
            try {
              syncResponse = await fetch(normalizedSyncUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${CONFIG.apiSecretKey}`,
                },
                body: JSON.stringify({
                  jobs: jobs.map((job) => ({
                    ...job,
                    experienceRequired: job.experienceRequired ?? null,
                  })),
                }),
              });
            } catch (fetchError) {
              if (attempt === maxSyncAttempts) {
                throw fetchError;
              }

              console.warn(
                `⚠️ Sync connection failed (attempt ${attempt}/${maxSyncAttempts}); retrying in 3 seconds...`
              );
              await new Promise((resolve) => setTimeout(resolve, 3000));
              continue;
            }

            const retryableStatus = [500, 502, 504].includes(syncResponse.status);
            if (!syncResponse.ok && retryableStatus && attempt < maxSyncAttempts) {
              console.warn(
                `⚠️ Sync API returned ${syncResponse.status} (attempt ${attempt}/${maxSyncAttempts}); retrying in 3 seconds...`
              );
              await new Promise((resolve) => setTimeout(resolve, 3000));
              continue;
            }

            break;
          }

          if (!syncResponse) {
            throw new Error('Sync request did not produce a response.');
          }

          const syncStatus = syncResponse.status;
          const responseText = await syncResponse.text();
          let syncResult: unknown;

          try {
            syncResult = JSON.parse(responseText);
          } catch {
            syncResult = responseText;
          }

          if (!syncResponse.ok) {
            console.error(`❌ Sync API returned status ${syncStatus}:`, syncResult);
            if (syncStatus === 401) {
              console.error(
                '👉 401 Unauthorized: Verify that API_SECRET_KEY in scraper/.env matches API_SECRET_KEY in Next.js (.env / Vercel Environment Variables).'
              );
            }
            throw new Error(`Failed to sync jobs. API responded with status ${syncStatus}`);
          }

          console.log(`🎉 Sync succeeded for ${url}! HTTP ${syncStatus}:`, syncResult);
        } else {
          console.log(`ℹ️  No job postings found on ${url}. Skipping sync.`);
        }

        // Close page to free memory
        if (page) {
          await page.close();
          page = undefined;
        }
        completedCount++;
      } catch (urlError) {
        failedCount++;
        console.error(`❌ Error scraping ${url}:`, (urlError as Error).message || urlError);
        continue;
      } finally {
        // Ensure page is cleaned up even if error occurred before page.close()
        if (page) {
          try {
            await page.close();
          } catch {
            // Ignore close error on failed page
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Scraper run summary:');
    console.log(`   - Successful job boards: ${completedCount}/${TARGET_URLS.length}`);
    console.log(`   - Failed job boards:     ${failedCount}/${TARGET_URLS.length}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Scraper encountered an unhandled fatal error:');
    console.error((error as Error).message || error);
    if ((error as Error).stack) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  } finally {
    // 4. Close browser ONCE after the loop completes
    if (browser) {
      console.log('🔒 Closing browser session...');
      await browser.close();
    }
  }
}

// Execute the scraper
runScraper();
