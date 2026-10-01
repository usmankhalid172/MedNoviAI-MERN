export const FEATURED_DOCTOR = {
  id: "3cbe9958-9ddc-4a74-b4c3-8823ede7d589",
  matchName: "hamiz ch",
  name: "Dr. Hamiz Ch",
  rating: 5,
} as const;

export function normalizeDoctorName(name: string): string {
  return name.trim().toLowerCase().replace(/^dr\.?\s*/i, "");
}

export function isFeaturedDoctor(candidate: {
  id?: string | null;
  name?: string | null;
}): boolean {
  if (candidate.id && candidate.id === FEATURED_DOCTOR.id) return true;
  if (!candidate.name) return false;
  return normalizeDoctorName(candidate.name) === FEATURED_DOCTOR.matchName;
}

export function applyFeaturedDoctor<T extends { name: string; rating: number }>(
  doctor: T
): T {
  if (!isFeaturedDoctor(doctor)) return doctor;
  return {
    ...doctor,
    name: FEATURED_DOCTOR.name,
    rating: FEATURED_DOCTOR.rating,
  };
}
