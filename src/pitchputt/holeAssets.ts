import { ImageSourcePropType } from 'react-native';

import { COURSES } from './data';

export type HoleAssetKey = `${string}/hole-${number}`;

const fallbackAsset = require('@/assets/images/partial-react-logo.png');

const HOLE_ASSET_MAP: Record<HoleAssetKey, ImageSourcePropType> = Object.fromEntries(
  COURSES.flatMap((course) =>
    course.holes.map((hole) => [
      hole.assetKey,
      // Placeholder until design exports are dropped into assets/holes.
      fallbackAsset,
    ]),
  ),
) as Record<HoleAssetKey, ImageSourcePropType>;

export function resolveHoleAsset(assetKey: string): ImageSourcePropType {
  return HOLE_ASSET_MAP[assetKey as HoleAssetKey] ?? fallbackAsset;
}
