/**
 * Multilingual title classification for Maharashtra-Board style channels.
 *
 * Titles on these channels mix three scripts freely — Devanagari Marathi,
 * Devanagari Hindi, romanised Marathi and English — often inside one line:
 *
 *   "इयत्ता 10वी विज्ञान भाग 1 | Chapter 3 Full Revision | Board Exam 2025"
 *   "Std 12 OCM Chapter 4 One Shot Marathi Medium"
 *
 * A single-axis classifier collapses under this: an announcement about exam
 * dates has no subject at all, so it lands in "Other" alongside genuinely
 * unparseable titles and the bucket stops meaning anything. Hence four
 * independent axes — a title can have a format and no subject, or a subject
 * and no grade, without any of them being a failure.
 *
 * Pure string work, no I/O — safe on both server and client.
 */

export type Subject =
  | 'Math'
  | 'Science'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Marathi'
  | 'Hindi'
  | 'English'
  | 'Sanskrit'
  | 'History'
  | 'Geography'
  | 'Civics'
  | 'Economics'
  | 'IT'
  | 'BookKeeping'
  | 'OCM'
  | 'SP';

export type Format =
  | 'OneShot'
  | 'PYQ'
  | 'Lecture'
  | 'Revision'
  | 'Numericals'
  | 'Practical'
  | 'Notes'
  | 'Live'
  | 'Doubt'
  | 'Strategy'
  | 'Shorts';

/**
 * Competitive/entrance exams, which sit alongside the board syllabus rather
 * than inside it. A separate axis because a video can target MHT-CET *and*
 * teach Physics, and because for classes 11-12 the entrance track is a
 * distinct market from board coursework.
 */
export type Exam = 'MHT-CET' | 'JEE' | 'NEET' | 'NCET' | 'Board' | 'Olympiad';

/** Why the video exists, independent of whether it teaches anything. */
export type Intent = 'Teaching' | 'News' | 'Motivation' | 'Promo' | 'Result' | 'Career';

export type Classification = {
  subject: Subject | null;
  format: Format | null;
  exam: Exam | null;
  intent: Intent;
  /** 9, 10, 11 or 12 when the title states it. */
  grade: number | null;
  /** Scripts detected in the title — useful for medium-level analysis. */
  scripts: Array<'devanagari' | 'latin'>;
};

/**
 * `Marathi Medium` / `Semi English` name the language of instruction, not the
 * subject — and these channels stamp them on nearly every title. Left in, they
 * make Marathi and English look like the most-taught subjects on the platform.
 * Stripped before subject matching only; the medium itself is still recoverable
 * from `scripts` and `detectMedium`.
 */
const MEDIUM_PATTERN =
  /\b(?:marathi|english|hindi|semi[\s-]?english|urdu)\s*(?:medium|med\b)|माध्यम/gi;

export function detectMedium(title: string): 'marathi' | 'english' | 'semi-english' | null {
  const lower = title.toLowerCase();
  if (/semi[\s-]?english/.test(lower)) return 'semi-english';
  if (/marathi\s*(?:medium|med\b)|मराठी माध्यम/.test(lower)) return 'marathi';
  if (/english\s*(?:medium|med\b)/.test(lower)) return 'english';
  return null;
}

/**
 * Strips the medium marker, lowercases, and collapses the punctuation these
 * titles are dense with (`|`, `||`, emoji, brackets) into single spaces, so
 * keyword matching doesn't have to care about separators. Devanagari has no
 * case, so `toLowerCase` leaves it untouched — one pass handles both scripts.
 */
function normalise(title: string): string {
  return ` ${title
    .replace(MEDIUM_PATTERN, ' ')
    .toLowerCase()
    .replace(/[|/\\\-–—_,.:;!?()[\]{}"'“”‘’#*@+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * Keyword tables. Order within a subject doesn't matter; every hit scores, and
 * the highest-scoring subject wins. Longer/more specific phrases are weighted
 * above bare words further down.
 */
const SUBJECT_TERMS: Record<Subject, string[]> = {
  Physics: ['physics', 'भौतिक', 'भौतिकशास्त्र', 'bhautik', 'kinematics', 'गती', 'प्रकाश', 'विद्युत'],
  Chemistry: ['chemistry', 'रसायन', 'रसायनशास्त्र', 'rasayan', 'mole concept', 'अणू', 'रेणू'],
  Biology: ['biology', 'जीवशास्त्र', 'jeev shastra', 'jivshastra', 'botany', 'zoology', 'पेशी'],
  Math: [
    'math',
    'maths',
    'mathematics',
    'गणित',
    'ganit',
    'algebra',
    'बीजगणित',
    'bijganit',
    'geometry',
    'भूमिती',
    'bhumiti',
    'trigonometry',
    'त्रिकोणमिती',
    'statistics',
    'संख्याशास्त्र'
  ],
  Science: ['science', 'विज्ञान', 'vidnyan', 'vigyan', 'सामान्य विज्ञान'],
  Marathi: ['marathi', 'मराठी', 'कुमारभारती', 'kumarbharati', 'व्याकरण मराठी'],
  Hindi: ['hindi', 'हिंदी', 'हिन्दी', 'लोकभारती', 'lokbharati'],
  English: ['english', 'इंग्रजी', 'इंग्लिश', 'grammar', 'yuvakbharati english'],
  Sanskrit: ['sanskrit', 'संस्कृत', 'amod', 'आमोद'],
  History: ['history', 'इतिहास', 'itihas', 'राज्यशास्त्र इतिहास'],
  Geography: ['geography', 'भूगोल', 'bhugol'],
  Civics: ['civics', 'नागरिकशास्त्र', 'राज्यशास्त्र', 'political science', 'rajyashastra'],
  Economics: ['economics', 'अर्थशास्त्र', 'arthashastra', 'micro economics', 'macro economics'],
  IT: ['information technology', 'माहिती तंत्रज्ञान', ' it ', 'html', 'javascript', 'seo'],
  BookKeeping: ['book keeping', 'bookkeeping', ' bk ', 'accountancy', 'लेखा', 'journal entry'],
  OCM: ['ocm', 'organisation of commerce', 'organization of commerce', 'वाणिज्य संघटन'],
  SP: ['secretarial practice', ' sp ', 'सचिवीय']
};

const FORMAT_TERMS: Record<Format, string[]> = {
  OneShot: ['one shot', 'oneshot', 'marathon', 'मॅरेथॉन', 'संपूर्ण धडा', 'full chapter in one'],
  PYQ: [
    'pyq',
    'previous year',
    'question paper',
    'प्रश्नपत्रिका',
    'paper solution',
    'सोडवलेली',
    'model answer',
    'सराव प्रश्नपत्रिका',
    'board paper'
  ],
  Revision: ['revision', 'उजळणी', 'ujalani', 'quick revision', 'सारांश', 'summary'],
  Numericals: ['numerical', 'सांख्यिक', 'problem solving', 'उदाहरणे', 'sums'],
  Practical: ['practical', 'प्रात्यक्षिक', 'experiment', 'प्रयोग', 'lab'],
  Notes: ['notes', 'नोट्स', 'pdf', 'handwritten'],
  Live: ['live', 'लाईव्ह', 'लाइव्ह'],
  Doubt: ['doubt', 'शंका', 'q&a', 'q a session', 'ask me'],
  Strategy: [
    'strategy',
    'how to study',
    'study plan',
    'time table',
    'अभ्यास कसा',
    'नियोजन',
    'tips',
    'टिप्स',
    'trick',
    'roadmap',
    'master plan',
    'planning',
    'days left',
    'days remaining',
    'month wise',
    'challenge',
    'how to manage',
    'how to start'
  ],
  Shorts: ['#shorts', 'shorts'],
  Lecture: ['lecture', 'व्याख्यान', 'chapter', 'धडा', 'पाठ', 'part 1', 'भाग', 'class ']
};

const EXAM_TERMS: Record<Exam, string[]> = {
  'MHT-CET': ['mht cet', 'mhtcet', 'mht-cet', 'cet cell', 'cet 20', 'percentile', 'एमएचटी'],
  JEE: ['jee main', 'jee advanced', ' jee ', 'iit jee'],
  NEET: ['neet ug', ' neet ', 'नीट'],
  NCET: ['ncet'],
  Olympiad: ['olympiad', 'ntse', 'homi bhabha', 'mts exam'],
  Board: ['board exam', 'hsc board', 'ssc board', 'hscboard', 'ssc 20', 'hsc 20', 'बोर्ड परीक्षा']
};

const INTENT_TERMS: Record<Exclude<Intent, 'Teaching'>, string[]> = {
  /**
   * Admissions, college and branch selection, placements. Distinct from News:
   * these are evergreen decision-guidance videos, not announcements, and on
   * senior-year channels they are a large share of output.
   */
  Career: [
    'engineering branch',
    'best college',
    'top college',
    'branch select',
    'placement',
    'campus tour',
    'which is better',
    'career',
    'after 12th',
    'after 10th',
    'btech',
    'b tech',
    'admission process',
    'counselling',
    'cut off',
    'कट ऑफ',
    'कॉलेज'
  ],
  News: [
    'time table',
    'timetable',
    'वेळापत्रक',
    'admission',
    'प्रवेश',
    'fyjc',
    'cap round',
    'big news',
    'मोठी बातमी',
    'breaking',
    'जाहीर',
    'announcement',
    'update',
    'अपडेट',
    'notice',
    'परिपत्रक',
    'syllabus change',
    'exam date',
    'hall ticket',
    'पुरवणी',
    'answer key',
    'objection',
    'revaluation',
    'rechecking',
    'photocopy',
    're-registration',
    'registration started',
    'form bhardo',
    'form fill'
  ],
  Result: ['result', 'निकाल', 'nikal', 'topper', 'merit list', 'गुणवत्ता यादी'],
  Motivation: [
    'motivation',
    'motivational',
    'प्रेरणा',
    'inspirational',
    'success story',
    'यशोगाथा',
    'never give up',
    'mindset'
  ],
  Promo: [
    'batch',
    'बॅच',
    'enroll',
    'admission open for',
    'course launch',
    'discount',
    'offer',
    'join now'
  ]
};

function scoreTerms(haystack: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (!haystack.includes(term)) continue;
    // Multi-word phrases are far less likely to collide than a bare word, so
    // they outweigh it — "one shot" should beat an incidental "chapter".
    score += term.includes(' ') ? 2 : 1;
  }
  return score;
}

function bestOf<K extends string>(haystack: string, table: Record<K, string[]>): K | null {
  let winner: K | null = null;
  let best = 0;
  for (const key of Object.keys(table) as K[]) {
    const score = scoreTerms(haystack, table[key]);
    if (score > best) {
      best = score;
      winner = key;
    }
  }
  return winner;
}

const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /[a-z]/i;

/**
 * Grade from any of the forms these channels use: `10th`, `Std 10`, `Class 10`,
 * `इयत्ता 10वी`, `१०वी`. Restricted to 9–12 so chapter numbers and years
 * ("Chapter 10", "2025") can't be mistaken for a grade.
 */
function detectGrade(raw: string): number | null {
  const devanagariDigits = raw.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
  // No trailing `\b`: JS word boundaries are ASCII-only, so `10वी` has no
  // boundary after the Devanagari suffix and the match silently failed.
  const patterns = [
    /(?:^|[^\d])(9|10|11|12)\s*(?:वी|वि)/,
    /\b(9|10|11|12)\s*(?:th|va)\b/i,
    /\b(?:std|standard|class|इयत्ता|कक्षा)\.?\s*(9|10|11|12)\b/i,
    /\b(9|10|11|12)\s*(?:&|and|\+)\s*(?:9|10|11|12)\b/i
  ];
  for (const pattern of patterns) {
    const match = devanagariDigits.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * @param keywords The creator's own video tags (from `getInfo`), when
 * available. Folded into the same text blob the title is matched against — a
 * creator-labelled subject ("Class 10 English Grammar" as a tag on a title
 * that doesn't itself name the subject) is a stronger signal than anything
 * inferred from the title text alone, and costs nothing extra to use since the
 * tags are already fetched alongside the exact view count.
 */
export function classifyTitle(title: string, keywords: string[] = []): Classification {
  const text = normalise(keywords.length ? `${title} ${keywords.join(' ')}` : title);

  const scripts: Classification['scripts'] = [];
  if (DEVANAGARI.test(title)) scripts.push('devanagari');
  if (LATIN.test(title)) scripts.push('latin');

  const subject = bestOf(text, SUBJECT_TERMS);
  const exam = bestOf(text, EXAM_TERMS);

  // `chapter` / `भाग` describe where a video sits in a series, not how it is
  // taught, and they co-occur with real formats constantly. Only fall back to
  // Lecture when nothing more specific matched.
  const { Lecture: lectureTerms, ...explicitFormats } = FORMAT_TERMS;
  const format =
    bestOf(text, explicitFormats) ?? (scoreTerms(text, lectureTerms) > 0 ? 'Lecture' : null);
  const nonTeaching = bestOf(text, INTENT_TERMS);

  // A title can carry both an intent keyword and a subject ("10th Science paper
  // pattern update"). Real teaching content almost always names a subject, so
  // subject presence wins the tie — otherwise every syllabus-adjacent lesson
  // gets misfiled as news.
  const intent: Intent = nonTeaching && !subject ? nonTeaching : 'Teaching';

  return { subject, format, exam, intent, grade: detectGrade(title), scripts };
}

/** Share of titles the classifier could place on a given axis. */
export function coverage(titles: string[]) {
  // Not a bare `titles.map(classifyTitle)`: Array#map passes (item, index,
  // array) positionally, and classifyTitle's second parameter is `keywords:
  // string[]` — the index would silently type-error into that slot.
  const results = titles.map((title) => classifyTitle(title));
  const pct = (n: number) => (titles.length === 0 ? 0 : Math.round((n / titles.length) * 100));
  return {
    total: titles.length,
    subject: pct(results.filter((r) => r.subject).length),
    exam: pct(results.filter((r) => r.exam).length),
    format: pct(results.filter((r) => r.format).length),
    grade: pct(results.filter((r) => r.grade).length),
    /** Titles that matched nothing on any axis. */
    unclassified: pct(
      results.filter((r) => !r.subject && !r.format && !r.exam && r.intent === 'Teaching').length
    )
  };
}
