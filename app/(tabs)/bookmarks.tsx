import { Loader } from '@/components/Loader';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { styles } from '@/styles/feed.styles';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function Bookmarks() {

  const bookmarkedPosts = useQuery(api.bookmarks.getBookmarkedPosts);

  if(bookmarkedPosts === undefined) return <Loader/>
  if(bookmarkedPosts.length === 0) return <NoBookmarksFound/>

   return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
      </View>

      {/* POSTS AND REELS */}
      <ScrollView
        contentContainerStyle={{
          padding: 8,
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {bookmarkedPosts.map((item) => {
          if (!item) return null;
          return (
            <View key={item._id} style={{ width: "33.33%", padding: 1, position: "relative" }}>
              <Image
                source={item.type === "post" ? item.imageUrl : item.videoUrl}
                style={{ width: "100%", aspectRatio: 1 }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              {/* Reel indicator */}
              {item.type === "reel" && (
                <View style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 12,
                  padding: 4,
                }}>
                  <Ionicons name="play" size={12} color={COLORS.white} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function NoBookmarksFound() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ color: COLORS.primary, fontSize: 22 }}>No bookmarked posts yet</Text>
    </View>
  );
}