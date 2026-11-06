import 'dotenv/config';
import { chromium } from 'patchright';
import Groq from 'groq-sdk';
import { TARGET_URLS } from './targets';

// Interface matching the Prisma schema and Next.js /api/jobs/sync endpoint
interface ScrapedJob {
  title: string;
  company: string;
  location?: string | null;
  salary?: string | null;
  link: string;
  matchScore?: number | null;
}

// Configuration from environment variables with sensible defaults
const CONFIG = {
  // Next.js API sync endpoint
  syncApiUrl: process.env.SYNC_API_URL || 'http://localhost:3000/api/jobs/sync',
  // Bearer authentication key for API access
  apiSecretKey: process.env.API_SECRET_KEY || '',
  // Groq API Key
  groqApiKey: process.env.GROQ_API_KEY || '',
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

  console.log(`📡 Sync Endpoint:   ${CONFIG.syncApiUrl}`);
  console.log(`🤖 AI Engine:       Groq (${CONFIG.groqModel})\n`);

  let browser;

  try {
    // 2. Launch stealth browser and context ONCE at the beginning
    console.log('🌐 Launching headless Chromium browser via Patchright...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });

    const groq = new Groq({ apiKey: CONFIG.groqApiKey });

    // 3. Process each job board URL sequentially
    let completedCount = 0;
    let failedCount = 0;

    for (const url of TARGET_URLS) {
      console.log('\n' + '-'.repeat(60));
      console.log(`🎯 Processing Job Board [${completedCount + failedCount + 1}/${TARGET_URLS.length}]: ${url}`);
      console.log('-'.repeat(60));

      let page;

      try {
        // Create new page for this URL
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

        // Extract visible body text and annotate links with their URLs
        console.log('🔍 Extracting page content and job links...');
        const extractedContent = await page.evaluate(() => {
          const clone = document.body.cloneNode(true) as HTMLElement;
          const anchors = clone.querySelectorAll('a');
          anchors.forEach((a) => {
            const href = a.href;
            const text = a.textContent?.trim() || '';
            if (href && text) {
              a.textContent = `${text} [LINK: ${href}]`;
            }
          });
          return clone.innerText || document.body.innerText || '';
        });

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

          console.log(`📤 Sending ${jobs.length} job(s) to ${CONFIG.syncApiUrl}...`);
          const syncResponse = await fetch(CONFIG.syncApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${CONFIG.apiSecretKey}`,
            },
            body: JSON.stringify({ jobs }),
          });

          const syncStatus = syncResponse.status;
          const responseText = await syncResponse.text();
          let syncResult: any;

          try {
            syncResult = JSON.parse(responseText);
          } catch {
            syncResult = responseText;
          }

          if (!syncResponse.ok) {
            console.error(`❌ Sync API returned status ${syncStatus}:`, syncResult);
            throw new Error(`Failed to sync jobs. API responded with status ${syncStatus}`);
          }

          console.log(`🎉 Sync succeeded for ${url}! HTTP ${syncStatus}:`, syncResult);
        } else {
          console.log(`ℹ️  No job postings found on ${url}. Skipping sync.`);
        }

        // Close page to free memory
        await page.close();
        page = undefined;
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
