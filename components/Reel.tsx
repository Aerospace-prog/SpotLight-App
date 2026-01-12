import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import CommentsModal from "./CommentsModal";

const { width: screenWidth } = Dimensions.get("window");

type ReelProps = {
  reel: {
    _id: Id<"reels">;
    videoUrl: string;
    caption?: string;
    likes: number;
    comments: number;
    views: number;
    isLiked: boolean;
    isBookmarked: boolean;
    isFollowing: boolean;
    isOwnReel: boolean;
    author: {
      _id: Id<"users">;
      username: string;
      image: string;
    };
  };
  currentUserId: Id<"users">;
  shouldPlay: boolean;
  height: number;
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return count.toString();
};

export default function Reel({ reel, currentUserId, shouldPlay, height }: ReelProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(reel.isBookmarked);
  const [isFollowing, setIsFollowing] = useState(reel.isFollowing);
  const [likeCount, setLikeCount] = useState(reel.likes);
  
  const lastTapRef = useRef<number>(0);
  const viewCountedRef = useRef(false);
  const router = useRouter();

  const toggleLike = useMutation(api.reels.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const toggleFollow = useMutation(api.users.toggleFollow);
  const incrementViews = useMutation(api.reels.incrementViews);

  // Check if this is the current user's own reel
  const isOwnReel = reel.isOwnReel;

  // Sync state when reel data changes (important for recycled views)
  useEffect(() => {
    setIsLiked(reel.isLiked);
    setIsBookmarked(reel.isBookmarked);
    setIsFollowing(reel.isFollowing);
    setLikeCount(reel.likes);
  }, [reel._id, reel.isLiked, reel.isBookmarked, reel.isFollowing, reel.likes]);

  // Animation values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const likeButtonScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const pauseIconOpacity = useSharedValue(0);
  const followButtonScale = useSharedValue(1);

  // Video player
  const player = useVideoPlayer(reel.videoUrl, (player) => {
    player.loop = true;
  });


  // Handle play/pause based on shouldPlay prop and isPaused state
  useEffect(() => {
    if (shouldPlay && !isPaused) {
      player.play();
      // Increment view count once per reel view
      if (!viewCountedRef.current) {
        viewCountedRef.current = true;
        incrementViews({ reelId: reel._id }).catch(console.error);
      }
    } else {
      player.pause();
    }
  }, [shouldPlay, isPaused]);

  // Handle mute state
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted]);

  // Reset view count tracking when reel changes
  useEffect(() => {
    viewCountedRef.current = false;
    setIsPaused(false); // Reset pause state for new reel
  }, [reel._id]);

  // Animated styles
  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const likeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeButtonScale.value }],
  }));

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const pauseIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pauseIconOpacity.value,
  }));

  const showHeartAnimation = () => {
    heartScale.value = 0;
    heartOpacity.value = 1;
    heartScale.value = withSequence(
      withSpring(1.2, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 4 }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 200 })
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200 })
    );
  };

  const showPauseAnimation = () => {
    pauseIconOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 200 })
    );
  };

  const handleDoubleTap = async () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      showHeartAnimation();
      likeButtonScale.value = withSequence(
        withSpring(1.3, { damping: 4 }),
        withSpring(1, { damping: 4 })
      );
      try {
        await toggleLike({ reelId: reel._id });
      } catch (error) {
        // Revert on error
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      }
    } else {
      showHeartAnimation();
    }
  };

  const handleSingleTap = () => {
    setIsPaused((prev) => !prev);
    showPauseAnimation();
  };

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current !== 0) {
          handleSingleTap();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleLikePress = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
    
    likeButtonScale.value = withSequence(
      withSpring(1.3, { damping: 4 }),
      withSpring(1, { damping: 4 })
    );

    try {
      await toggleLike({ reelId: reel._id });
    } catch (error) {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
    }
  };

  const handleBookmarkPress = async () => {
    const newIsBookmarked = !isBookmarked;
    setIsBookmarked(newIsBookmarked);
    
    bookmarkScale.value = withSequence(
      withSpring(1.3, { damping: 4 }),
      withSpring(1, { damping: 4 })
    );

    try {
      await toggleBookmark({ reelId: reel._id });
    } catch (error) {
      setIsBookmarked(!newIsBookmarked);
    }
  };

  const handleFollowPress = async () => {
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);
    
    followButtonScale.value = withSequence(
      withSpring(1.2, { damping: 4 }),
      withSpring(1, { damping: 4 })
    );

    try {
      await toggleFollow({ followingId: reel.author._id });
    } catch (error) {
      setIsFollowing(!newIsFollowing);
    }
  };

  const handleProfilePress = () => {
    router.push(`/user/${reel.author._id}`);
  };

  const followButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: followButtonScale.value }],
  }));


  return (
    <View style={[styles.container, { height }]}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoContainer}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />

          {/* Center Heart Animation */}
          <Animated.View style={[styles.centerHeart, heartAnimatedStyle]}>
            <Ionicons name="heart" size={100} color={COLORS.heart} />
          </Animated.View>

          {/* Pause Icon */}
          <Animated.View style={[styles.pauseIcon, pauseIconAnimatedStyle]}>
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={60}
              color="rgba(255,255,255,0.8)"
            />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Right Side Actions */}
      <View style={styles.actionsContainer}>
        {/* Author Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handleProfilePress}>
          <Image source={{ uri: reel.author.image }} style={styles.avatar} />
          {!isOwnReel && !isFollowing && (
            <TouchableOpacity style={styles.followBadge} onPress={handleFollowPress}>
              <Ionicons name="add" size={12} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
          <Animated.View style={likeButtonAnimatedStyle}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={32}
              color={isLiked ? COLORS.heart : COLORS.white}
            />
          </Animated.View>
          <Text style={styles.actionText}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-outline" size={30} color={COLORS.white} />
          <Text style={styles.actionText}>{formatCount(reel.comments)}</Text>
        </TouchableOpacity>

        {/* Bookmark Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleBookmarkPress}>
          <Animated.View style={bookmarkAnimatedStyle}>
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={30}
              color={isBookmarked ? COLORS.primary : COLORS.white}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="paper-plane-outline" size={28} color={COLORS.white} />
        </TouchableOpacity>

        {/* Mute Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsMuted((prev) => !prev)}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomContainer}>
        {/* Author Info */}
        <View style={styles.authorInfo}>
          <TouchableOpacity onPress={handleProfilePress}>
            <Text style={styles.username}>@{reel.author.username}</Text>
          </TouchableOpacity>
          {!isOwnReel && (
            <Animated.View style={followButtonAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={handleFollowPress}
              >
                <Text
                  style={[
                    styles.followText,
                    isFollowing && styles.followingText,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Caption */}
        {reel.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {reel.caption}
          </Text>
        )}

        {/* Music Info */}
        <View style={styles.musicContainer}>
          <Ionicons name="musical-notes" size={14} color={COLORS.white} />
          <Text style={styles.musicText} numberOfLines={1}>
            Original Audio - {reel.author.username}
          </Text>
        </View>

        {/* View Count */}
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={14} color={COLORS.grey} />
          <Text style={styles.viewsText}>{formatCount(reel.views)} views</Text>
        </View>
      </View>

      {/* Comments Modal */}
      <CommentsModal
        reelId={reel._id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  centerHeart: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseIcon: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 50,
    padding: 15,
  },
  actionsContainer: {
    position: "absolute",
    right: 12,
    bottom: 120,
    alignItems: "center",
    gap: 20,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  followBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 60,
    left: 12,
    right: 80,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  username: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  followButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: 4,
  },
  followingButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: COLORS.grey,
  },
  followText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  followingText: {
    color: COLORS.grey,
  },
  caption: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  musicContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  musicText: {
    color: COLORS.white,
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewsText: {
    color: COLORS.grey,
    fontSize: 12,
    marginLeft: 4,
  },
});
