import type { SkillLocation } from '../types/SkillLocation.ts';

export const uniqueByRealDir = (
  locations: ReadonlyArray<SkillLocation>,
): ReadonlyArray<SkillLocation> =>
  locations.filter(
    (location, index) =>
      locations.findIndex(
        (other) => other.id === location.id && other.realDir === location.realDir,
      ) === index,
  );
