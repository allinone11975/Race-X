/**
 * RACE-X  ·  Music Prompt Moderation Filter
 * Blocks explicit, illegal, hate, violence content
 * All prompts sanitized BEFORE any API call
 */

// ─── Blocked keyword categories ──────────────────────────────────────────────
const BLOCKED_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'Violence',
    patterns: [
      /\b(kill|murder|slaughter|massacre|gore|torture|dismember|behead)\b/i,
    ],
  },
  {
    category: 'Explicit Sexual',
    patterns: [
      /\b(porn|sex|nude|naked|nsfw|xxx|erotic|orgasm|masturbat)\b/i,
    ],
  },
  {
    category: 'Hate Speech',
    patterns: [
      /\b(n[i1]gg[ae]r|ch[i1]nk|sp[i1]c|k[i1]ke|f[a4]gg[o0]t|sand[- ]?n[i1]gg[ae]r)\b/i,
    ],
  },
  {
    category: 'Terrorism / Extremism',
    patterns: [
      /\b(jihad|isis|al[- ]qaeda|terror[i1]st|bomb[- ]?making|explosiv)\b/i,
    ],
  },
  {
    category: 'Illegal Drugs',
    patterns: [
      /\b(heroin|meth|cocaine|fentanyl|crack[- ]?cocaine|drug[- ]?deal)\b/i,
    ],
  },
];

export interface ModerationResult {
  is_safe: boolean;
  blocked_category?: string;
  sanitized_prompt: string;
  warning?: string;
}

// ─── Main scan function ───────────────────────────────────────────────────────
export function moderatePrompt(rawPrompt: string): ModerationResult {
  const trimmed = rawPrompt.trim().slice(0, 500); // cap at 500 chars

  for (const { category, patterns } of BLOCKED_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return {
          is_safe: false,
          blocked_category: category,
          sanitized_prompt: '',
          warning: `Your prompt was blocked (${category} content). Please revise and try again.`,
        };
      }
    }
  }

  // Sanitize: strip special chars except musical notation symbols
  const sanitized = trimmed
    .replace(/[<>{}[\]\\|`]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { is_safe: true, sanitized_prompt: sanitized };
}

// ─── Batch scan ───────────────────────────────────────────────────────────────
export function moderateBatch(prompts: string[]): ModerationResult[] {
  return prompts.map(moderatePrompt);
}
