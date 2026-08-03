import type { TrackedChannel } from '../api/types';

/**
 * The Maharashtra Board 9-12 competitive set.
 *
 * Every handle here was resolved against the live API before being added — a
 * handle that 404s renders as a broken card, and guessing them from search
 * results is how that happens. Two candidates were deliberately left out:
 * Study with Sudhir (ICSE, not Maharashtra Board) and AbhyasOnline (a
 * name-collision channel with 16 subscribers).
 */
export type RosterGroup = 'own' | 'faculty' | 'ssc' | 'hsc';

/** The standards a workspace scopes to. */
export type Standard = 9 | 10 | 11 | 12;

export const STANDARDS: Standard[] = [9, 10, 11, 12];

export type RosterChannel = TrackedChannel & {
  group: RosterGroup;
  /**
   * Which standards this channel actually serves. Many-to-many on purpose:
   * "PW Maharashtra 9&10" competes for both cohorts, and forcing it into one
   * would make either workspace incomplete.
   */
  standards: Standard[];
  /**
   * Row id of the stored channel, needed to edit workspace membership. Absent
   * for the static roster, which has no database rows until a user is seeded.
   */
  rowId?: string;
  /** Workspaces this channel belongs to. */
  workspaceIds?: string[];
  /** Why this channel is in the set — shown as the card's context line. */
  note: string;
};

export const ROSTER_GROUPS: Record<RosterGroup, { title: string; description: string }> = {
  own: {
    title: 'Your channels',
    description: 'EasyLearning properties — the baseline everything else is measured against.'
  },
  faculty: {
    title: 'Faculty channels',
    description:
      'Teachers listed on easylearning.live who also run their own channels — audience that belongs to the teacher, not the brand.'
  },
  ssc: {
    title: 'Competitors — Class 9 & 10 (SSC)',
    description: 'Channels competing for the same SSC audience.'
  },
  hsc: {
    title: 'Competitors — Class 11 & 12 (HSC / MHT-CET)',
    description: 'Senior-year and entrance-exam channels.'
  }
};

export const ROSTER: RosterChannel[] = [
  {
    id: '@EasyLearningLive',
    standards: [9, 10],
    label: 'EasyLearning Maharashtra 9 & 10',
    group: 'own',
    note: 'Main brand channel',
    addedAt: ''
  },
  {
    id: '@EasyLearningSeniors',
    standards: [11, 12],
    label: 'EasyLearning Maharashtra 11 & 12',
    group: 'own',
    note: 'Senior-year channel',
    addedAt: ''
  },
  {
    id: '@easylearningshubhamjha',
    standards: [9, 10],
    label: 'Shubham Jha',
    group: 'own',
    note: 'Founder channel — larger reach than the brand channel',
    addedAt: ''
  },

  /**
   * Faculty identity was confirmed from each channel's own description, not
   * from the name matching a staff list — "Galaxy Parmar" and "Parth Momaya"
   * are both common enough to collide. Teachers whose search results were
   * ambiguous or clearly someone else (sub-100-subscriber namesakes) are
   * omitted rather than guessed at.
   */
  {
    id: '@ParthMomaya',
    standards: [9, 10, 11, 12],
    label: 'Parth Momaya',
    group: 'faculty',
    note: 'Science — 685K, far larger than the brand channel',
    addedAt: ''
  },
  {
    id: '@GalaxyofMaths',
    standards: [9, 10],
    label: 'Galaxy of Maths',
    group: 'faculty',
    note: 'Galaxy Parmar, Maths — confirmed in channel description',
    addedAt: ''
  },
  {
    id: '@ParthMomaya11th',
    standards: [11, 12],
    label: 'Parth Momaya - 11th and 12th',
    group: 'faculty',
    note: 'Maharashtra Board Biology, launched Mar 2025',
    addedAt: ''
  },
  {
    id: '@thegalaxyteacher',
    standards: [9],
    label: 'Galaxy of Maths - 5th to 8th',
    group: 'faculty',
    note: 'Junior-grade spin-off',
    addedAt: ''
  },

  /**
   * Added after auditing CompetitorScope, the tracker EasyLearning already
   * runs: these were tracked there but missing here, including JR Tutorials —
   * the segment leader at 2.4M, 36% of the competitive set. Benchmarks computed
   * without the biggest player in the market describe a smaller market.
   */
  {
    id: '@JRTutorials',
    standards: [9, 10],
    label: 'JR Tutorials',
    group: 'ssc',
    note: 'Segment leader — 2.4M, 36% of the tracked set',
    addedAt: ''
  },
  {
    id: '@stateboardwalebhaiya',
    standards: [9, 10],
    label: 'State Board Wale Bhaiya',
    group: 'ssc',
    note: 'Independent, 715K',
    addedAt: ''
  },
  {
    id: '@GIRITUTORIALS',
    standards: [9, 10],
    label: 'Giri Tutorials',
    group: 'ssc',
    note: 'High-volume independent — 5,900 videos',
    addedAt: ''
  },
  {
    id: '@YogeshSirsBackbenchers',
    standards: [9, 10],
    label: "Yogesh Sir's Backbenchers",
    group: 'ssc',
    note: 'Independent, 402K',
    addedAt: ''
  },
  {
    id: '@DTEducation747',
    standards: [9, 10],
    label: 'DT Education',
    group: 'ssc',
    note: 'Independent, 215K',
    addedAt: ''
  },
  {
    id: '@cracksmartlyMotion10th',
    standards: [9, 10],
    label: 'Crack Smartly with Motion',
    group: 'ssc',
    note: 'Motion-backed, 96.1K',
    addedAt: ''
  },
  {
    id: '@diwithsolutions',
    standards: [9, 10],
    label: 'Di with Solutions',
    group: 'ssc',
    note: 'Small challenger, 16.6K',
    addedAt: ''
  },

  {
    id: '@PWMaharashtra910',
    standards: [9, 10],
    label: 'PW Maharashtra 9&10',
    group: 'ssc',
    note: 'Physics Wallah state-board arm',
    addedAt: ''
  },
  {
    id: '@V_Maharashtra_9_10',
    standards: [9, 10],
    label: 'Vedantu Maharashtra 9 & 10',
    group: 'ssc',
    note: 'Vedantu state-board arm',
    addedAt: ''
  },
  {
    id: '@HomeRevise',
    standards: [9, 10],
    label: 'Home Revise',
    group: 'ssc',
    note: 'Marathi-medium syllabus coverage',
    addedAt: ''
  },
  {
    id: '@dineshsirsmartstudy',
    standards: [9, 10],
    label: 'MahaToppers - 9th & 10th',
    group: 'ssc',
    note: 'Independent SSC channel',
    addedAt: ''
  },
  {
    id: '@UnacademyMaharashtraBoard',
    standards: [9, 10],
    label: 'Unacademy Maharashtra 9 & 10',
    group: 'ssc',
    note: 'Closest competitor by size',
    addedAt: ''
  },
  {
    id: '@TargetMaharashtraBoard',
    standards: [9, 10],
    label: 'TMA Maharashtra State Board',
    group: 'ssc',
    note: 'Small challenger',
    addedAt: ''
  },

  {
    id: '@dineshsirlivestudy',
    standards: [11, 12],
    label: 'DINESH SIR Live Study',
    group: 'hsc',
    note: 'Largest in the set — MHT-CET led',
    addedAt: ''
  },
  {
    id: '@NewIndianEra',
    standards: [11, 12],
    label: 'New Indian Era (NIE)',
    group: 'hsc',
    note: 'MHT-CET and HSC roadmaps',
    addedAt: ''
  },
  {
    id: '@PWMaharashtra',
    standards: [11, 12],
    label: 'PW Maharashtra',
    group: 'hsc',
    note: 'Physics Wallah HSC arm',
    addedAt: ''
  },
  {
    id: '@MukeshNayakSir',
    standards: [11, 12],
    label: 'Physics Gyaan Mukesh Nayak',
    group: 'hsc',
    note: 'Subject specialist — HSC Physics',
    addedAt: ''
  },
  {
    id: '@GyanLab',
    standards: [11, 12],
    label: 'GYAN LAB',
    group: 'hsc',
    note: 'Subject specialist — Biology',
    addedAt: ''
  },
  {
    id: '@VMaharashtraBoards',
    standards: [11, 12],
    label: 'V Maharashtra Boards + MHT-CET',
    group: 'hsc',
    note: 'Vedantu HSC + entrance arm',
    addedAt: ''
  }
];
