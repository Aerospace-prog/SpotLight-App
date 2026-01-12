import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/create.styles";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import { Image } from "expo-image";

import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import ReelCreator from "@/components/ReelCreator";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

type CreateMode = "post" | "reel";

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [createMode, setCreateMode] = useState<CreateMode>("post");
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);
      const uploadUrl = await generateUploadUrl();

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, selectedImage, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        mimeType: "image/jpeg",
      });

      if (uploadResult.status !== 200) throw new Error("Upload failed");

      const { storageId } = JSON.parse(uploadResult.body);
      await createPost({ storageId, caption });

      setSelectedImage(null);
      setCaption("");

      router.push("/(tabs)");
    } catch (error) {
      console.log("Error sharing post", error);
    } finally {
      setIsSharing(false);
    }
  };

  // If reel mode is selected, show the reel creator
  if (createMode === "reel") {
    return <ReelCreator onClose={() => setCreateMode("post")} />;
  }

  if (!selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Mode Selection */}
        <View style={styles.modeSelection}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              createMode === "post" && styles.modeButtonActive,
            ]}
            onPress={() => setCreateMode("post")}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={createMode === "post" ? COLORS.primary : COLORS.grey}
            />
            <Text
              style={[
                styles.modeButtonText,
                createMode === "post" && styles.modeButtonTextActive,
              ]}
            >
              Post
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              createMode === "reel" && styles.modeButtonActive,
            ]}
            onPress={() => setCreateMode("reel")}
          >
            <Ionicons
              name="videocam-outline"
              size={24}
              color={createMode === "reel" ? COLORS.primary : COLORS.grey}
            />
            <Text
              style={[
                styles.modeButtonText,
                createMode === "reel" && styles.modeButtonTextActive,
              ]}
            >
              Reel
            </Text>
          </TouchableOpacity>
        </View>

        {createMode === "post" && (
          <TouchableOpacity style={styles.emptyImageContainer} onPress={pickImage}>
            <Ionicons name="image-outline" size={48} color={COLORS.grey} />
            <Text style={styles.emptyImageText}>Tap to select an image</Text>
          </TouchableOpacity>
        )}

        {createMode === "reel" && (
          <TouchableOpacity
            style={styles.emptyImageContainer}
            onPress={() => setCreateMode("reel")}
          >
            <Ionicons name="videocam-outline" size={48} color={COLORS.grey} />
            <Text style={styles.emptyImageText}>Tap to create a reel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.contentContainer}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null);
              setCaption("");
            }}
            disabled={isSharing}
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={isSharing ? COLORS.grey : COLORS.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.shareText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentOffset={{ x: 0, y: 100 }}
        >
          <View style={[styles.content, isSharing && styles.contentDisabled]}>
            {/* IMAGE SECTION */}
            <View style={styles.imageSection}>
              <Image
                source={selectedImage}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
                disabled={isSharing}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.white} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* INPUT SECTION */}
            <View style={styles.inputSection}>
              <View style={styles.captionContainer}>
                <Image
                  source={user?.imageUrl}
                  style={styles.userAvatar}
                  contentFit="cover"
                  transition={200}
                />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isSharing}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}