import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
import {
    FlatList,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    View,
    ViewabilityConfig,
    ViewToken,
} from "react-native";
import { Loader } from "./Loader";
import Reel from "./Reel";

export default function ReelsPlayer() {
  const [currentViewableItemIndex, setCurrentViewableItemIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const isFocused = useIsFocused();
  
  const reelsData = useQuery(api.reels.getFeedReels);

  const viewabilityConfig: ViewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentViewableItemIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  // Calculate reel height - must be before any conditional returns
  const reelHeight = containerHeight > 0 ? containerHeight : 700;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: reelHeight,
      offset: reelHeight * index,
      index,
    }),
    [reelHeight]
  );

  // Early returns after all hooks
  if (reelsData === undefined) {
    return <Loader />;
  }

  const { reels, currentUserId } = reelsData;

  if (!reels || reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reels yet</Text>
      </View>
    );
  }

  const renderReel = ({ item, index }: { item: any; index: number }) => (
    <Reel
      reel={item}
      currentUserId={currentUserId}
      shouldPlay={index === currentViewableItemIndex && isFocused}
      height={reelHeight}
    />
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {containerHeight > 0 && (
        <FlatList
          data={reels}
          renderItem={renderReel}
          keyExtractor={(item) => item._id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          getItemLayout={getItemLayout}
          snapToInterval={reelHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={2}
          windowSize={3}
          initialNumToRender={1}
          bounces={false}
          overScrollMode="never"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  emptyText: {
    color: COLORS.grey,
    fontSize: 16,
  },
});
