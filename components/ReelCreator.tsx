import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type ReelCreatorProps = {
  onClose: () => void;
};

export default function ReelCreator({ onClose }: ReelCreatorProps) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { user } = useUser();

  const generateUploadUrl = useMutation(api.reels.generateUploadUrl);
  const createReel = useMutation(api.reels.createReel);

  // Create video player for preview - always call the hook, use empty string as fallback
  const player = useVideoPlayer(recordedVideo || "", (player) => {
    player.loop = true;
  });

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.container} />;
  }

  const requestAllPermissions = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
  };

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="videocam-outline" size={64} color={COLORS.primary} style={{ marginBottom: 20 }} />
        <Text style={styles.permissionText}>
          We need camera and microphone permissions to record reels
        </Text>
        <TouchableOpacity onPress={requestAllPermissions} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60, // 60 seconds max
      });
      
      if (video) {
        setRecordedVideo(video.uri);
        setShowCaptionModal(true);
      }
    } catch (error: any) {
      console.error("Error recording video:", error);
      Alert.alert("Recording Error", error?.message || "Failed to record video. Please ensure camera and microphone permissions are granted.");
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const handleUpload = async () => {
    if (!recordedVideo) return;

    try {
      setIsUploading(true);
      
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Read the file and upload
      const response = await fetch(recordedVideo);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: blob,
        headers: {
          "Content-Type": "video/mp4",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const result = await uploadResponse.json();
      const { storageId } = result;
      
      // Create reel record
      await createReel({
        storageId,
        caption: caption.trim() || undefined,
      });

      // Clean up
      setRecordedVideo(null);
      setCaption("");
      setShowCaptionModal(false);
      
      Alert.alert("Success", "Reel uploaded successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)/reels"),
        },
      ]);
    } catch (error: any) {
      console.error("Error uploading reel:", error);
      Alert.alert("Error", error?.message || "Failed to upload reel");
    } finally {
      setIsUploading(false);
    }
  };

  const discardVideo = () => {
    setRecordedVideo(null);
    setCaption("");
    setShowCaptionModal(false);
  };

  if (recordedVideo) {
    return (
      <Modal visible={showCaptionModal} animationType="slide">
        <KeyboardAvoidingView
          style={styles.captionContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.captionHeader}>
            <TouchableOpacity onPress={discardVideo}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.captionTitle}>Add Caption</Text>
            <TouchableOpacity onPress={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.shareButton}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Video Preview */}
          <View style={styles.videoPreview}>
            <VideoView
              style={styles.previewVideo}
              player={player}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
          </View>

          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={COLORS.grey}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
          />

          <Text style={styles.characterCount}>{caption.length}/500</Text>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing} 
        ref={cameraRef}
        mode="video"
      />
      
      {/* Top Controls - Overlay */}
      <View style={styles.topControls}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls - Overlay */}
      <View style={styles.bottomControls}>
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonInnerActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.grey,
    fontSize: 14,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  bottomControls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  recordingControls: {
    alignItems: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  recordButtonActive: {
    borderColor: COLORS.heart,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
  },
  recordButtonInnerActive: {
    backgroundColor: COLORS.heart,
    borderRadius: 8,
    width: 40,
    height: 40,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.heart,
    marginRight: 8,
  },
  recordingText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  captionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  captionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  captionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  shareButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  videoPreview: {
    width: screenWidth * 0.4,
    height: screenWidth * 0.6,
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewVideo: {
    width: "100%",
    height: "100%",
  },
  captionInput: {
    color: COLORS.white,
    fontSize: 16,
    padding: 20,
    textAlignVertical: "top",
    minHeight: 120,
  },
  characterCount: {
    color: COLORS.grey,
    fontSize: 12,
    textAlign: "right",
    paddingHorizontal: 20,
  },
});