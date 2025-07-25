import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { styles } from "../../styles/profile.styles";

export default function Profile() {
  const { signOut, userId } = useAuth();
  const { user } = useUser();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listType, setListType] = useState<"followers" | "following" | null>(null);
  const [selectedPost, setSelectedPost] = useState<Doc<"posts"> | null>(null);

  const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip");
  const posts = useQuery(api.posts.getPostsByUser, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const toggleFollow = useMutation(api.users.toggleFollow);
  const isFollowingQuery = useQuery;

  // Use Convex useQuery for followers/following
  const followersList = useQuery(
    api.users.getFollowers,
    currentUser?._id && listType === "followers" && listModalVisible
      ? { userId: currentUser._id as Id<"users"> }
      : "skip"
  );
  const followingList = useQuery(
    api.users.getFollowing,
    currentUser?._id && listType === "following" && listModalVisible
      ? { userId: currentUser._id as Id<"users"> }
      : "skip"
  );
  const loadingList = listModalVisible &&
    ((listType === "followers" && followersList === undefined) ||
      (listType === "following" && followingList === undefined));
  const selectedList =
    listType === "followers"
      ? followersList || []
      : listType === "following"
      ? followingList || []
      : [];

  // Memoize following IDs for quick lookup
  const followingIds = useMemo(() => new Set((followingList || []).map(u => u?._id?.toString())), [followingList]);
  const [localFollowingIds, setLocalFollowingIds] = useState<Set<string>>(new Set());

  // Sync localFollowingIds with followingIds when modal opens
  useEffect(() => {
    if (listModalVisible && followingIds) {
      setLocalFollowingIds(new Set(Array.from(followingIds).filter((id): id is string => typeof id === 'string')));
    }
  }, [listModalVisible, followingIds]);

  const handleFollowToggle = async (userIdToToggle: string) => {
    try {
      await toggleFollow({ followingId: userIdToToggle as Id<'users'> });
      setLocalFollowingIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(userIdToToggle)) {
          newSet.delete(userIdToToggle);
        } else {
          newSet.add(userIdToToggle);
        }
        return newSet;
      });
    } catch (e) {}
  };

  const [editedProfile, setEditedProfile] = useState({
    fullname: currentUser?.fullname || "",
    bio: currentUser?.bio || "",
  });

  const handleSaveProfile = async () => {
    await updateProfile(editedProfile);
    setIsEditModalVisible(false);
  };

  const handleFollowBack = async (userIdToFollow: string) => {
    try {
      await toggleFollow({ followingId: userIdToFollow as Id<'users'> });
      if (listType) {
        setListModalVisible(false);
        setListType(null);
      }
    } catch (e) {}
  };

  if (!currentUser || posts === undefined) return <Loader />;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>{currentUser.username}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          {/* AVATAR & STATS */}
          <View style={styles.avatarAndStats}>
            <View style={styles.avatarContainer}>
              <Image
                source={currentUser.image}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentUser.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <TouchableOpacity style={styles.statItem} onPress={() => { setListType("followers"); setListModalVisible(true); }}> 
                <Text style={styles.statNumber}>{currentUser.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => { setListType("following"); setListModalVisible(true); }}> 
                <Text style={styles.statNumber}>{currentUser.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.name}>{currentUser.fullname}</Text>
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalVisible(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {posts.length === 0 && <NoPostsFound />}

        <FlatList
          data={posts}
          numColumns={3}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedPost(item)}>
              <Image
                source={item.imageUrl}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      {/* FOLLOWERS/FOLLOWING MODAL */}
      <Modal
        visible={listModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setListModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{listType === "followers" ? "Followers" : "Following"}</Text>
                <TouchableOpacity onPress={() => setListModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {loadingList ? (
                <Loader />
              ) : (
                <FlatList
                  data={selectedList}
                  keyExtractor={(item, index) => (item?._id ? item._id.toString() : index.toString())}
                  renderItem={({ item }) => (
                    item ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 8 }}>
                        <Image source={item.image} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.white, fontWeight: "bold" }}>{item.fullname}</Text>
                          <Text style={{ color: COLORS.grey }}>{item.username}</Text>
                        </View>
                        {item._id !== currentUser._id && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: localFollowingIds.has(item._id.toString()) ? '#EF4444' : COLORS.primary,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8
                            }}
                            onPress={() => handleFollowToggle(item._id.toString())}
                          >
                            <Text style={{ color: COLORS.white, fontWeight: "bold" }}>
                              {localFollowingIds.has(item._id.toString()) ? 'Unfollow' : 'Follow'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null
                  )}
                  ListEmptyComponent={<Text style={{ color: COLORS.grey, textAlign: "center", marginTop: 20 }}>No users found.</Text>}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedProfile.fullname}
                  onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, fullname: text }))}
                  placeholderTextColor={COLORS.grey}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editedProfile.bio}
                  onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, bio: text }))}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.grey}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SELECTED IMAGE MODAL */}
      <Modal
        visible={!!selectedPost}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalBackdrop}>
          {selectedPost && (
            <View style={styles.postDetailContainer}>
              <View style={styles.postDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Image
                source={selectedPost.imageUrl}
                cachePolicy={"memory-disk"}
                style={styles.postDetailImage}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function NoPostsFound() {
  return (
    <View
      style={{
        height: "100%",
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="images-outline" size={48} color={COLORS.primary} />
      <Text style={{ fontSize: 20, color: COLORS.white }}>No posts yet</Text>
    </View>
  );
}