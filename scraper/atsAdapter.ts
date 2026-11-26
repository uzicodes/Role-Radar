export interface RawScrapedJob {
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  experienceRequired: string | null;
  link: string;
  matchScore: number | null;
  description: string;
  department?: string | null;
  workType?: string | null;
}

export interface AtsBoard {
  name: string;
  url: string;
}

interface AtsEndpoint {
  provider: 'Greenhouse' | 'Lever' | 'Ashby' | 'Workable';
  slug: string;
}

type JsonFetchResult =
  | { ok: true; data: unknown }
  | { ok: false };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    return value.map(textValue).filter((value): value is string => value !== null).join(', ') || null;
  }
  if (isRecord(value)) {
    for (const key of ['name', 'label', 'title']) {
      const text = textValue(value[key]);
      if (text) return text;
    }
  }
  return null;
}

function locationValue(value: unknown): string | null {
  const directValue = textValue(value);
  if (directValue) return directValue;
  if (!isRecord(value)) return null;

  return ['city', 'region', 'country']
    .map((key) => textValue(value[key]))
    .filter((value): value is string => value !== null)
    .join(', ') || null;
}

function plainTextFromHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    copy: '©',
    gt: '>',
    ldquo: '"',
    lsquo: "'",
    lt: '<',
    mdash: '—',
    nbsp: ' ',
    ndash: '–',
    quot: '"',
    rdquo: '"',
    reg: '®',
    rsquo: "'",
  };

  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, encoded: string) => {
      const key = encoded.toLowerCase();
      if (key.startsWith('#x')) {
        const codePoint = Number.parseInt(key.slice(2), 16);
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
      }
      if (key.startsWith('#')) {
        const codePoint = Number.parseInt(key.slice(1), 10);
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
      }
      return namedEntities[key] ?? entity;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function endpointFor(url: string): AtsEndpoint | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const slugSegment = parsedUrl.pathname.split('/').filter(Boolean)[0];
  if (!slugSegment) return null;

  let slug: string;
  try {
    slug = decodeURIComponent(slugSegment);
  } catch {
    return null;
  }

  switch (parsedUrl.hostname.toLowerCase()) {
    case 'boards.greenhouse.io':
    case 'job-boards.greenhouse.io':
      return { provider: 'Greenhouse', slug };
    case 'jobs.lever.co':
      return { provider: 'Lever', slug };
    case 'jobs.ashbyhq.com':
      return { provider: 'Ashby', slug };
    case 'apply.workable.com':
      return { provider: 'Workable', slug };
    default:
      return null;
  }
}

async function fetchJson(
  board: AtsBoard,
  url: string,
  init?: RequestInit,
): Promise<JsonFetchResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[ATS JSON] ${board.name}: request failed; falling back to Chromium (${message}).`);
    return { ok: false };
  }

  if (response.status !== 200) {
    console.warn(
      `[ATS JSON] ${board.name}: API returned HTTP ${response.status}; falling back to Chromium.`,
    );
    return { ok: false };
  }

  try {
    return { ok: true, data: await response.json() as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[ATS JSON] ${board.name}: API returned invalid JSON; falling back to Chromium (${message}).`);
    return { ok: false };
  }
}

function recordsFrom(data: unknown, ...keys: string[]): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return null;

  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return null;
}

function makeJob(
  board: AtsBoard,
  title: unknown,
  location: unknown,
  link: unknown,
  description: unknown,
  metadata: { department?: unknown; workType?: unknown } = {},
): RawScrapedJob | null {
  const normalizedTitle = textValue(title);
  const normalizedLink = textValue(link);
  if (!normalizedTitle || !normalizedLink) return null;

  return {
    title: normalizedTitle,
    company: board.name,
    location: locationValue(location),
    salary: null,
    experienceRequired: null,
    link: normalizedLink,
    matchScore: null,
    description: textValue(description) ?? '',
    department: textValue(metadata.department),
    workType: textValue(metadata.workType),
  };
}

function mapRecords(
  board: AtsBoard,
  records: unknown[],
  mapper: (record: JsonRecord) => RawScrapedJob | null,
): RawScrapedJob[] {
  const jobs: RawScrapedJob[] = [];
  let skippedCount = 0;

  for (const item of records) {
    const job = isRecord(item) ? mapper(item) : null;
    if (job) jobs.push(job);
    else skippedCount++;
  }

  if (skippedCount > 0) {
    console.warn(`[ATS JSON] ${board.name}: skipped ${skippedCount} posting(s) with missing title or URL.`);
  }

  return jobs;
}

export async function tryFetchAtsJobs(
  board: AtsBoard,
): Promise<{ handled: boolean; jobs: RawScrapedJob[] }> {
  const endpoint = endpointFor(board.url);
  if (!endpoint) return { handled: false, jobs: [] };

  let apiUrl: string;
  let requestInit: RequestInit | undefined;
  switch (endpoint.provider) {
    case 'Greenhouse':
      apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(endpoint.slug)}/jobs?content=true`;
      break;
    case 'Lever':
      apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(endpoint.slug)}?mode=json`;
      break;
    case 'Ashby':
      apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(endpoint.slug)}`;
      break;
    case 'Workable':
      apiUrl = `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(endpoint.slug)}/jobs`;
      requestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          location: [],
          department: [],
          worktype: [],
          remote: [],
        }),
      };
      break;
  }

  const result = await fetchJson(board, apiUrl, requestInit);
  if (!result.ok) return { handled: false, jobs: [] };

  let records: unknown[] | null;
  let jobs: RawScrapedJob[];

  switch (endpoint.provider) {
    case 'Greenhouse':
      records = recordsFrom(result.data, 'jobs');
      if (records) {
        jobs = mapRecords(board, records, (record) =>
          makeJob(
            board,
            record.title,
            isRecord(record.location) ? record.location.name : record.location,
            record.absolute_url,
            typeof record.content === 'string' ? plainTextFromHtml(record.content) : '',
          ),
        );
      }
      break;
    case 'Lever':
      records = recordsFrom(result.data, 'postings');
      if (records) {
        jobs = mapRecords(board, records, (record) => {
          const categories = isRecord(record.categories) ? record.categories : {};
          return makeJob(
            board,
            record.text,
            categories.location,
            record.hostedUrl,
            record.descriptionPlain,
          );
        });
      }
      break;
    case 'Ashby':
      records = recordsFrom(result.data, 'jobs');
      if (records) {
        jobs = mapRecords(board, records, (record) =>
          makeJob(
            board,
            record.title,
            record.location,
            record.jobUrl,
            record.descriptionPlain,
          ),
        );
      }
      break;
    case 'Workable':
      records = recordsFrom(result.data, 'jobs', 'results');
      if (records) {
        jobs = mapRecords(board, records, (record) => {
          const shortcode = textValue(record.shortcode);
          const location = isRecord(record.location) ? record.location : {};
          const description = textValue(record.descriptionPlain) ??
            (typeof record.description === 'string' ? plainTextFromHtml(record.description) : '');
          return makeJob(
            board,
            record.title,
            location,
            shortcode
              ? `https://apply.workable.com/${encodeURIComponent(endpoint.slug)}/j/${encodeURIComponent(shortcode)}/`
              : null,
            description,
            {
              department: record.department,
              workType: record.worktype ?? record.workType ?? record.employmentType,
            },
          );
        });
      }
      break;
  }

  if (!records || !jobs) {
    console.warn(`[ATS JSON] ${board.name}: API response shape was unexpected; falling back to Chromium.`);
    return { handled: false, jobs: [] };
  }

  return { handled: true, jobs };
}
