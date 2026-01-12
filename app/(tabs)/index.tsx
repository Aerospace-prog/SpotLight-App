import { Loader } from "@/components/Loader";
import Post from "@/components/Post";
import SuggestedUsersModal from "@/components/SuggestedUsersModal";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/feed.styles";

export default function Index() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();
  const [suggestedVisible, setSuggestedVisible] = useState(false);

  const posts = useQuery(api.posts.getFeedPosts);
  const searchResults = useQuery(api.users.searchUsers, search.trim() ? { query: search } : "skip");
  // Get current user's Convex id for comparison
  const currentUserConvex = useQuery(api.users.getUserByClerkId, user ? { clerkId: user.id } : "skip");

  if (posts === undefined) return <Loader />;
  if (posts.length === 0) return <NoPostsFound />;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>spotlight</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSuggestedVisible(true)} style={{ marginRight: 12 }}>
            <Ionicons name="person-add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <SuggestedUsersModal visible={suggestedVisible} onClose={() => setSuggestedVisible(false)} />

      {/* SEARCH BAR */}
      <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
        <TextInput
          style={{
            backgroundColor: COLORS.surface,
            color: COLORS.white,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 16,
          }}
          placeholder="Search users by username or name..."
          placeholderTextColor={COLORS.grey}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
        />
        {search.trim() && searchFocused && (
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 8,
            marginTop: 4,
            maxHeight: 200,
            zIndex: 10,
          }}>
            {searchResults === undefined ? (
              <Text style={{ color: COLORS.grey, padding: 12 }}>Searching...</Text>
            ) : searchResults.length === 0 ? (
              <Text style={{ color: COLORS.grey, padding: 12 }}>No users found.</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id.toString()}
                renderItem={({ item }) => (
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", padding: 12 }}
                    onPress={() => {
                      setSearch("");
                      setSearchFocused(false);
                      if (currentUserConvex && item._id === currentUserConvex._id) {
                        router.push("/(tabs)/profile");
                      } else {
                        router.push(`/user/${item._id}`);
                      }
                    }}
                  >
                    <Image source={{ uri: item.image }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                    <View>
                      <Text style={{ color: COLORS.white, fontWeight: "bold" }}>{item.fullname}</Text>
                      <Text style={{ color: COLORS.grey }}>{item.username}</Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        )}
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => <Post post={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
}

const NoPostsFound = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: COLORS.background,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ fontSize: 20, color: COLORS.primary }}>No posts yet</Text>
  </View>
);