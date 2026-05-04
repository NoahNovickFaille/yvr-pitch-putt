import { Course } from './types';

const HOLE_TEMPLATE = new Array(18).fill(3);

/**
 * Card yardages (yards), index 0 = hole 1 … index 17 = hole 18.
 * Replace each course’s numbers with real values from the scorecard.
 */
const YARDAGES_BY_SLUG: Record<string, readonly number[]> = {
  'queen-elizabeth': [
    // hole:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18
    70, 110, 65, 40, 85, 60, 90, 65, 65, 70, 65, 85, 80, 80, 110, 90, 50, 80,
  ],
  'rupert-park': [
    65, 75, 70, 70, 75, 65, 60, 55, 50, 55, 65, 55, 55, 100, 75, 95, 85, 65,
  ],
  'stanley-park': [
    50, 70, 75, 65, 100, 80, 60, 75, 40, 80, 60, 50, 65, 95, 50, 50, 65, 75,
  ],
};

function yardageForHole(slug: string, holeIndex: number): number {
  const list = YARDAGES_BY_SLUG[slug];
  const fromCard = list?.[holeIndex];
  if (typeof fromCard === 'number') {
    return fromCard;
  }
  // Fallback if slug missing or list wrong length (keeps UI usable while editing).
  return 68 + (holeIndex + 1) * 5;
}

function buildCourse(id: string, slug: string, name: string): Course {
  return {
    id,
    slug,
    name,
    city: 'Vancouver',
    province: 'BC',
    holes: HOLE_TEMPLATE.map((par, index) => ({
      id: `${slug}-h${index + 1}`,
      number: index + 1,
      par,
      yardage: yardageForHole(slug, index),
      assetKey: `${slug}/hole-${index + 1}`,
    })),
  };
}

export const COURSES: Course[] = [
  buildCourse('course-qe', 'queen-elizabeth', 'Queen Elizabeth Pitch & Putt'),
  buildCourse('course-rupert', 'rupert-park', 'Rupert Park Pitch & Putt'),
  buildCourse('course-stanley', 'stanley-park', 'Stanley Park Pitch & Putt'),
];

export const getCourseById = (courseId: string) => COURSES.find((course) => course.id === courseId);
