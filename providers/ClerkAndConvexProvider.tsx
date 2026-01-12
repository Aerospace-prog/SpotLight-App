import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import Constants from 'expo-constants';
import React from "react";

const publishableKey = Constants.expoConfig?.extra?.expoPublicClerkPublishableKey;
const convexUrl = Constants.expoConfig?.extra?.expoPublicConvexUrl;

if (!publishableKey) {
  throw new Error("Missing Publishable Key for Clerk");
}

if (!convexUrl) {
  throw new Error("Missing Convex URL. Make sure EXPO_PUBLIC_CONVEX_URL is set in .env.local");
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});



export default function ClerkAndConvexProvider({children} : {children:React.ReactNode}) {
  return(
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
            <ClerkLoaded>
                {children}
            </ClerkLoaded>
        </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}