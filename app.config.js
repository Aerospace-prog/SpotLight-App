import 'dotenv/config';

if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error("❌ Missing Clerk publishable key: Check if --env-file .env.local is passed!");
}

export default ({ config }) => ({
  ...config,
  name: "spotlightApp",
  slug: "spotlightApp",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "spotlightapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.aerospace.spotlightApp",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.aerospace.spotlightApp",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-video",
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to record reels.",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone to record reels.",
        recordAudioAndroid: true
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "266ed39c-c1cc-4093-a59f-671493f9acee",
    },
    expoPublicClerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    expoPublicConvexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  },
  owner: "aerospace",
});
