export declare function countSyllables(word: string): number;
export declare function fleschKincaidGrade(text: string): number;
export declare function substituteTaughtTerms(text: string, terms: string[]): string;
export declare const MAX_GRADE: Record<'8-10' | '11-14', number>;
export declare const MIN_WORDS: number;
export declare const GLOSS_MAX: Record<'grade_5' | 'grade_8', number>;
export declare const TAUGHT_TERMS: string[];
export declare function gradeFor(text: string, band: '8-10' | '11-14'): number;
export declare function checkString(
  text: string,
  band: '8-10' | '11-14',
): { ok: boolean; grade: number; skipped: boolean };
