import { describe, expect, test } from 'bun:test';

import { classifyTitle, coverage, detectMedium } from './taxonomy';

describe('medium markers', () => {
  test('"Marathi Medium" is a medium, not the subject Marathi', () => {
    // Regression: these channels stamp the medium on nearly every title, which
    // made Marathi and English look like the most-taught subjects on the
    // platform and inflated their measured performance.
    const result = classifyTitle('Std 12 OCM Chapter 4 One Shot Marathi Medium');
    expect(result.subject).toBe('OCM');
    expect(detectMedium('Std 12 OCM Chapter 4 One Shot Marathi Medium')).toBe('marathi');
  });

  test('"English Medium" does not classify as the subject English', () => {
    expect(classifyTitle('Science Chapter 3 English Medium Class 10').subject).toBe('Science');
  });

  test('Semi English is detected distinctly', () => {
    expect(detectMedium('Class 9 Maths Semi English')).toBe('semi-english');
  });

  test('an actual Marathi subject still classifies as Marathi', () => {
    expect(classifyTitle('मराठी कुमारभारती धडा 3 | इयत्ता 10वी').subject).toBe('Marathi');
  });
});

describe('grade detection', () => {
  test('Devanagari suffixes are matched', () => {
    // Regression: JS word boundaries are ASCII-only, so the trailing \b after
    // वी never matched and every Devanagari-suffixed grade was missed.
    expect(classifyTitle('इयत्ता 10वी विज्ञान भाग 1').grade).toBe(10);
    expect(classifyTitle('12वी Physics Numericals').grade).toBe(12);
  });

  test('Devanagari digits are normalised', () => {
    expect(classifyTitle('इयत्ता ९वी संस्कृत आमोद').grade).toBe(9);
  });

  test('Latin forms are matched', () => {
    expect(classifyTitle('Std 11 Economics Chapter 2').grade).toBe(11);
    expect(classifyTitle('Class 9 Bhugol Revision').grade).toBe(9);
    expect(classifyTitle('10th Board Paper Solution').grade).toBe(10);
  });

  test('chapter and year numbers are not mistaken for grades', () => {
    expect(classifyTitle('Chapter 10 Trigonometry Sums').grade).toBeNull();
    expect(classifyTitle('Board Exam 2026 Announcement').grade).toBeNull();
  });
});

describe('format', () => {
  test('an explicit format beats the structural Lecture fallback', () => {
    // "chapter" and "भाग" describe position in a series, not how it is taught,
    // and they co-occur with real formats constantly.
    expect(classifyTitle('इयत्ता 10वी विज्ञान भाग 1 | Chapter 3 Full Revision').format).toBe(
      'Revision'
    );
  });

  test('Lecture is used only when nothing more specific matches', () => {
    expect(classifyTitle('Science Chapter 3 Lecture 1').format).toBe('Lecture');
  });

  test('PYQ recognises both scripts', () => {
    expect(classifyTitle('गणित भाग 2 | प्रश्नपत्रिका सोडवलेली').format).toBe('PYQ');
    expect(classifyTitle('Maths 1 Previous Year Question Paper').format).toBe('PYQ');
  });

  test('one-shot and marathon collapse to the same format', () => {
    expect(classifyTitle('Algebra One Shot Class 10').format).toBe('OneShot');
    expect(classifyTitle('Maths Maha Marathon 🔥').format).toBe('OneShot');
  });
});

describe('intent', () => {
  test('announcements with no subject are News, not Teaching', () => {
    const result = classifyTitle('FYJC Admission 2026 | CAP Round 1 मोठी बातमी');
    expect(result.intent).toBe('News');
    expect(result.subject).toBeNull();
  });

  test('a subject present means it is teaching, even alongside news words', () => {
    // Otherwise every syllabus-adjacent lesson gets misfiled as news.
    expect(classifyTitle('Science paper pattern update Class 10').intent).toBe('Teaching');
  });

  test('results and promos are separated from news', () => {
    expect(classifyTitle('SSC Result 2026 जाहीर | निकाल').intent).toBe('Result');
    expect(classifyTitle('New Batch Enroll Now | Discount Offer').intent).toBe('Promo');
  });

  test('career guidance is distinct from announcements', () => {
    expect(classifyTitle('Best Engineering Branch After MHT-CET | Top College').intent).toBe(
      'Career'
    );
  });
});

describe('exam axis', () => {
  test('entrance exams are detected independently of subject', () => {
    const result = classifyTitle('MHT-CET 2026 Physics Numericals Practice');
    expect(result.exam).toBe('MHT-CET');
    expect(result.subject).toBe('Physics');
  });

  test('board exams are distinguished from entrance exams', () => {
    expect(classifyTitle('HSC Board 2027 Time Table Released').exam).toBe('Board');
  });

  test('a plain lesson has no exam', () => {
    expect(classifyTitle('Algebra Chapter 2 Explained').exam).toBeNull();
  });
});

describe('scripts', () => {
  test('mixed-script titles report both', () => {
    expect(classifyTitle('इयत्ता 10वी Science Chapter 3').scripts.toSorted()).toEqual([
      'devanagari',
      'latin'
    ]);
  });
});

describe('creator keywords', () => {
  test('a keyword can supply a subject the title text does not name', () => {
    // The whole point of using keywords: real creator tags on generic titles
    // ("Part 3", "Unit Test") that name nothing classifiable on their own.
    const result = classifyTitle('Part 3 | Unit Test', ['Class 10 English Grammar']);
    expect(result.subject).toBe('English');
  });

  test('with no keywords argument, behaviour is unchanged', () => {
    // Every existing call site omits the second argument; it must keep working.
    expect(classifyTitle('Class 10 Science Chapter 3').subject).toBe('Science');
  });

  test('an empty keywords array behaves identically to omitting it', () => {
    expect(classifyTitle('Class 10 Science Chapter 3', [])).toEqual(
      classifyTitle('Class 10 Science Chapter 3')
    );
  });

  test('grade is read from the title only, never from keywords', () => {
    // Keywords are often templated across a channel's whole catalogue (e.g. a
    // channel tagging every upload "Class 9, Class 10, Class 11" for reach).
    // Letting them set grade would make every video look multi-grade.
    const result = classifyTitle('Algebra Chapter 2', ['Class 9', 'Class 10', 'Class 11']);
    expect(result.grade).toBeNull();
  });

  test('scripts are detected from the title only, never from keywords', () => {
    const result = classifyTitle('Algebra Chapter 2', ['मराठी माध्यम']);
    expect(result.scripts).toEqual(['latin']);
  });
});

describe('coverage', () => {
  test('a title matching nothing on any axis counts as unclassified', () => {
    const result = coverage(['zzz qqq wwq']);
    expect(result.unclassified).toBe(100);
  });

  test('a title with only an exam is not counted as unclassified', () => {
    // The point of the separate axes: no subject is not the same as no signal.
    expect(coverage(['MHT-CET 2026 answer key objection window']).unclassified).toBe(0);
  });
});
