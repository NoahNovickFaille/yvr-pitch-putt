import Constants from "expo-constants";
import * as Linking from "expo-linking";

/** Deep link opened by the app to claim a shared player scorecard. */
export function buildRoundClaimUrl(token: string): string {
  return Linking.createURL("/claim", { queryParams: { token } });
}

/** Human-readable share message including the claim link. */
export function buildRoundShareMessage(playerName: string, courseLabel: string, url: string): string {
  const appName =
    Constants.expoConfig?.name?.replace(" (Dev)", "") ?? "Pitch Putt YVR";
  return `${playerName}, here is your scorecard from ${courseLabel} on ${appName}.\n\nOpen to claim it in the app:\n${url}`;
}
