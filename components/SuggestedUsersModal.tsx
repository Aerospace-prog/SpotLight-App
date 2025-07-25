import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Modal, SafeAreaView, Text, TouchableOpacity, View } from "react-native";

export default function SuggestedUsersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const suggested = useQuery(api.users.getSuggestedUsers);
  const toggleFollow = useMutation(api.users.toggleFollow);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  const handleFollow = async (userId: string) => {
    setLoadingIds(ids => [...ids, userId]);
    await toggleFollow({ followingId: userId as any });
    setLoadingIds(ids => ids.filter(id => id !== userId));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ width: '92%', maxHeight: '80%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, alignItems: 'stretch' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
              <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 20 }}>Suggested Users</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            {suggested === undefined ? (
              <Text style={{ color: COLORS.grey, textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : suggested.length === 0 ? (
              <Text style={{ color: COLORS.grey, textAlign: 'center', marginTop: 20 }}>No suggestions right now.</Text>
            ) : (
              <FlatList
                data={suggested}
                keyExtractor={item => item._id.toString()}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>{item.fullname}</Text>
                      <Text style={{ color: COLORS.grey }}>{item.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, opacity: loadingIds.includes(item._id.toString()) ? 0.6 : 1 }}
                      onPress={() => handleFollow(item._id.toString())}
                      disabled={loadingIds.includes(item._id.toString())}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Follow</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.surfaceLight, marginVertical: 4 }} />}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
} 