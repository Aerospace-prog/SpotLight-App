import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/notifications.styles";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Notification({ notification }: any) {
  // Determine if this is a reel or post notification
  const isReelNotification = !!notification.reel;
  const mediaUrl = isReelNotification ? notification.reel?.videoUrl : notification.post?.imageUrl;

  return (
    <View style={[styles.notificationItem, { borderRadius: 14, marginBottom: 16, backgroundColor: COLORS.surface, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 6 }]}>
      <View style={styles.notificationContent}>
        <Link href={`/user/${notification.sender?._id ?? ''}`} asChild>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image
              source={notification.sender?.image}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.iconBadge}>
              {notification.type === "like" ? (
                <Ionicons name="heart" size={14} color={COLORS.primary} />
              ) : notification.type === "follow" ? (
                <Ionicons name="person-add" size={14} color="#8B5CF6" />
              ) : (
                <Ionicons name="chatbubble" size={14} color="#3B82F6" />
              )}
            </View>
          </TouchableOpacity>
        </Link>

        <View style={styles.notificationInfo}>
          <Link href={`/user/${notification.sender?._id ?? ''}`} asChild>
            <TouchableOpacity>
              <Text style={styles.username}>{String(notification.sender?.username ?? '')}</Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.action}>
            {notification.type === "follow"
              ? "started following you"
              : notification.type === "like"
              ? `liked your ${isReelNotification ? "reel" : "post"}`
              : `commented: "${String(notification.comment ?? '')}"`}
          </Text>
          <Text style={styles.timeAgo}>
            {formatDistanceToNow(notification._creationTime, { addSuffix: true })}
          </Text>
        </View>
      </View>

      {mediaUrl && (
        <View style={{ position: "relative" }}>
          <Image
            source={mediaUrl}
            style={styles.postImage}
            contentFit="cover"
            transition={200}
          />
          {isReelNotification && (
            <View style={{
              position: "absolute",
              top: 4,
              right: 4,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 8,
              padding: 2,
            }}>
              <Ionicons name="play" size={10} color={COLORS.white} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}