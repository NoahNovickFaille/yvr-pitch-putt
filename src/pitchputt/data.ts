import { Course } from './types';

const HOLE_TEMPLATE = new Array(18).fill(3);

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
      yardage: 68 + (index + 1) * 5,
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
