import { ImageSourcePropType } from "react-native";

export type HoleAssetKey = `${string}/hole-${number}`;

const fallbackAsset = require("@/assets/images/fallback-hole.png");

const HOLE_ASSET_MAP: Partial<Record<HoleAssetKey, ImageSourcePropType>> = {
  "queen-elizabeth/hole-1": require("@/assets/images/holes/queen-elizabeth/hole-1.png"),
  "queen-elizabeth/hole-2": require("@/assets/images/holes/queen-elizabeth/hole-2.png"),
  "queen-elizabeth/hole-3": require("@/assets/images/holes/queen-elizabeth/hole-3.png"),
  "queen-elizabeth/hole-4": require("@/assets/images/holes/queen-elizabeth/hole-4.png"),
  "queen-elizabeth/hole-5": require("@/assets/images/holes/queen-elizabeth/hole-5.png"),
  "queen-elizabeth/hole-6": require("@/assets/images/holes/queen-elizabeth/hole-6.png"),
  "queen-elizabeth/hole-7": require("@/assets/images/holes/queen-elizabeth/hole-7.png"),
  "queen-elizabeth/hole-8": require("@/assets/images/holes/queen-elizabeth/hole-8.png"),
  "queen-elizabeth/hole-9": require("@/assets/images/holes/queen-elizabeth/hole-9.png"),
  "queen-elizabeth/hole-10": require("@/assets/images/holes/queen-elizabeth/hole-10.png"),
  "queen-elizabeth/hole-11": require("@/assets/images/holes/queen-elizabeth/hole-11.png"),
  "queen-elizabeth/hole-12": require("@/assets/images/holes/queen-elizabeth/hole-12.png"),
  "queen-elizabeth/hole-13": require("@/assets/images/holes/queen-elizabeth/hole-13.png"),
  "queen-elizabeth/hole-14": require("@/assets/images/holes/queen-elizabeth/hole-14.png"),
  "queen-elizabeth/hole-15": require("@/assets/images/holes/queen-elizabeth/hole-15.png"),
  "queen-elizabeth/hole-16": require("@/assets/images/holes/queen-elizabeth/hole-16.png"),
  "queen-elizabeth/hole-17": require("@/assets/images/holes/queen-elizabeth/hole-17.png"),
  "queen-elizabeth/hole-18": require("@/assets/images/holes/queen-elizabeth/hole-18.png"),

  "rupert-park/hole-1": fallbackAsset,
  "rupert-park/hole-2": fallbackAsset,
  "rupert-park/hole-3": fallbackAsset,
  "rupert-park/hole-4": fallbackAsset,
  "rupert-park/hole-5": fallbackAsset,
  "rupert-park/hole-6": fallbackAsset,
  "rupert-park/hole-7": fallbackAsset,
  "rupert-park/hole-8": fallbackAsset,
  "rupert-park/hole-9": fallbackAsset,
  "rupert-park/hole-10": fallbackAsset,
  "rupert-park/hole-11": fallbackAsset,
  "rupert-park/hole-12": fallbackAsset,
  "rupert-park/hole-13": fallbackAsset,
  "rupert-park/hole-14": fallbackAsset,
  "rupert-park/hole-15": fallbackAsset,
  "rupert-park/hole-16": fallbackAsset,
  "rupert-park/hole-17": fallbackAsset,
  "rupert-park/hole-18": fallbackAsset,

  "stanley-park/hole-1": fallbackAsset,
  "stanley-park/hole-2": fallbackAsset,
  "stanley-park/hole-3": fallbackAsset,
  "stanley-park/hole-4": fallbackAsset,
  "stanley-park/hole-5": fallbackAsset,
  "stanley-park/hole-6": fallbackAsset,
  "stanley-park/hole-7": fallbackAsset,
  "stanley-park/hole-8": fallbackAsset,
  "stanley-park/hole-9": fallbackAsset,
  "stanley-park/hole-10": fallbackAsset,
  "stanley-park/hole-11": fallbackAsset,
  "stanley-park/hole-12": fallbackAsset,
  "stanley-park/hole-13": fallbackAsset,
  "stanley-park/hole-14": fallbackAsset,
  "stanley-park/hole-15": fallbackAsset,
  "stanley-park/hole-16": fallbackAsset,
  "stanley-park/hole-17": fallbackAsset,
  "stanley-park/hole-18": fallbackAsset,
};

export function resolveHoleAsset(assetKey: string): ImageSourcePropType {
  return HOLE_ASSET_MAP[assetKey as HoleAssetKey] ?? fallbackAsset;
}
