import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { resolveHoleAsset } from "./holeAssets";

interface HoleIllustrationProps {
  assetKey: string;
}

export function HoleIllustration({ assetKey }: HoleIllustrationProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={resolveHoleAsset(assetKey)}
        style={styles.image}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#24864f",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
