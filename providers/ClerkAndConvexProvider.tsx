import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import React from "react";
import Constants from 'expo-constants';

const publishableKey = Constants.expoConfig?.extra?.expoPublicClerkPublishableKey;
const convexUrl = Constants.expoConfig?.extra?.expoPublicConvexUrl;

if (!publishableKey) {
  throw new Error("Missing Publishable Key for Clerk");
}

const convex = new ConvexReactClient(convexUrl!, {
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