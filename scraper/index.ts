import 'dotenv/config';
import { chromium } from 'patchright';

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
  // Default target URL (Greenhouse or Lever placeholder)
  targetUrl: process.env.TARGET_JOB_BOARD_URL || 'https://boards.greenhouse.io/canonical',
  // Next.js API sync endpoint
  syncApiUrl: process.env.SYNC_API_URL || 'http://localhost:3000/api/jobs/sync',
  // Bearer authentication key for API access
  apiSecretKey: process.env.API_SECRET_KEY || '',
};

async function runScraper(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🚀 RoleRadar Job Scraper starting up...');
  console.log('='.repeat(60));

  // 1. Validation checks
  if (!CONFIG.apiSecretKey) {
    console.warn('⚠️  Warning: API_SECRET_KEY is empty. Sync request to /api/jobs/sync might return 401.');
  }

  console.log(`🎯 Target Job Board: ${CONFIG.targetUrl}`);
  console.log(`📡 Sync Endpoint:   ${CONFIG.syncApiUrl}\n`);

  let browser;

  try {
    // 2. Launch stealth browser with Patchright
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

    const page = await context.newPage();

    // 3. Navigate to target URL and wait for content to load
    console.log(`⏳ Navigating to ${CONFIG.targetUrl}...`);
    const response = await page.goto(CONFIG.targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    console.log(`📄 Page response status: ${response?.status() ?? 'N/A'}`);

    // Wait for body to be available and visible
    await page.waitForSelector('body', { timeout: 15000 });

    // 4. Extract visible body text and embed link URLs
    console.log('🔍 Extracting page content and job links...');
    const extractedContent = await page.evaluate(() => {
      // Clone body to annotate anchor tags with their resolved URLs
      const clone = document.body.cloneNode(true) as HTMLElement;

      // Annotate all link tags with their full href so the LLM knows the real link
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

    // Truncate if exceedingly long to stay well within token limits (keeps first ~40,000 chars)
    const MAX_CHARS = 40000;
    const trimmedContent =
      extractedContent.length > MAX_CHARS
        ? extractedContent.substring(0, MAX_CHARS) + '\n...[Content truncated for length]'
        : extractedContent;

    // 5. AI structured parsing
    // =========================================================================
    // TODO: Insert Groq API extraction here
    // Use Groq SDK to process `trimmedContent` and parse job postings into `jobs`
    // =========================================================================
    const jobs: ScrapedJob[] = [];

    console.log(`✅ Extracted ${jobs.length} job(s).`);

    if (jobs.length === 0) {
      console.log('ℹ️  No job postings to sync (awaiting Groq integration). Exiting.');
      return;
    }

    // Preview top 3 jobs in console
    console.log('\n--- Jobs Sample ---');
    jobs.slice(0, 3).forEach((job, idx) => {
      console.log(`[${idx + 1}] ${job.title} | ${job.company} (${job.location || 'N/A'})`);
      console.log(`    Link: ${job.link}`);
      if (job.salary) console.log(`    Salary: ${job.salary}`);
      if (job.matchScore) console.log(`    Match Score: ${job.matchScore}`);
    });
    if (jobs.length > 3) console.log(`... and ${jobs.length - 3} more.`);
    console.log('-------------------\n');

    // 6. Send the extracted jobs to Next.js /api/jobs/sync
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
    let syncResult: any;

    try {
      syncResult = await syncResponse.json();
    } catch {
      syncResult = await syncResponse.text();
    }

    if (!syncResponse.ok) {
      console.error(`❌ Sync API returned status ${syncStatus}:`, syncResult);
      throw new Error(`Failed to sync jobs. API responded with status ${syncStatus}`);
    }

    console.log(`🎉 Sync succeeded! HTTP ${syncStatus}:`, syncResult);
    console.log(`   - Received by API: ${syncResult.received ?? jobs.length}`);
    console.log(`   - Added to Database: ${syncResult.added ?? 'N/A'}`);
    console.log('='.repeat(60));
    console.log('✨ Scraper completed successfully.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Scraper encountered an unhandled error:');
    console.error((error as Error).message || error);
    if ((error as Error).stack) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  } finally {
    if (browser) {
      console.log('🔒 Closing browser session...');
      await browser.close();
    }
  }
}

// Execute the scraper
runScraper();
