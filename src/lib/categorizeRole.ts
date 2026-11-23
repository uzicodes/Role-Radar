export type RoleCategory =
  | "All"
  | "Full-Stack"
  | "Frontend"
  | "Backend"
  | "AI / ML & Data"
  | "DevOps & Cloud"
  | "QA & Testing"
  | "Other Roles";

export const ROLE_CATEGORIES: readonly RoleCategory[] = [
  "All",
  "Full-Stack",
  "Frontend",
  "Backend",
  "AI / ML & Data",
  "DevOps & Cloud",
  "QA & Testing",
  "Other Roles",
] as const;

export function categorizeJobRole(
  title: string,
): Exclude<RoleCategory, "All"> {
  const normalized = title.toLowerCase();

  const frontend =
    /\b(front[- ]?end|react|reactjs|next\.?js|vue|vuejs|angular|svelte|javascript|typescript|web developer|ui developer|ui engineer|css|tailwind|html)\b/i;
  const backend =
    /\b(back[- ]?end|server[- ]?side|node\.?js|express|nestjs|spring|django|flask|\.net|c#|golang|go developer|ruby|rails|php|laravel|java developer|python developer|api developer|database developer)\b/i;

  if (
    /\b(ai|artificial intelligence|ml|machine learning|data scientist|data science|data engineer|data analyst|analytics|nlp|deep learning|computer vision|llm|pytorch|tensorflow|statistician)\b/i.test(
      normalized,
    )
  ) {
    return "AI / ML & Data";
  }

  if (
    /\b(devops|dev sec ops|sre|site reliability|platform engineer|cloud engineer|cloud architect|aws|azure|gcp|google cloud|kubernetes|docker|terraform|ansible|infrastructure)\b/i.test(
      normalized,
    )
  ) {
    return "DevOps & Cloud";
  }

  if (
    /\b(qa|quality assurance|quality engineer|test engineer|testing|sdet|automation test|manual test)\b/i.test(
      normalized,
    )
  ) {
    return "QA & Testing";
  }

  if (frontend.test(normalized)) return "Frontend";
  if (backend.test(normalized)) return "Backend";

  if (
    /\b(full[- ]?stack|swe|software engineer|software developer|programmer|application developer)\b/i.test(
      normalized,
    )
  ) {
    return "Full-Stack";
  }

  return "Other Roles";
}
