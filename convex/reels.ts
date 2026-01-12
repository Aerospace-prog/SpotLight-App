import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

export const createReel = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const videoUrl = await ctx.storage.getUrl(args.storageId);
    if (!videoUrl) throw new Error("Video not found");

    // create reel
    const reelId = await ctx.db.insert("reels", {
      userId: currentUser._id,
      videoUrl,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      comments: 0,
      views: 0,
      duration: args.duration,
    });

    // increment user's post count by 1 (reels count as posts)
    await ctx.db.patch(currentUser._id, {
      posts: currentUser.posts + 1,
    });

    return reelId;
  },
});

export const getFeedReels = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // get all reels ordered by creation time (newest first)
    const reels = await ctx.db.query("reels").order("desc").collect();
    if (reels.length === 0) return { reels: [], currentUserId: currentUser._id };

    // enhance reels with user data and interaction status
    const reelsWithInfo = await Promise.all(
      reels.map(async (reel) => {
        const reelAuthor = (await ctx.db.get(reel.userId))!;

        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_reel", (q) =>
            q.eq("userId", currentUser._id).eq("reelId", reel._id)
          )
          .first();

        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_user_and_reel", (q) =>
            q.eq("userId", currentUser._id).eq("reelId", reel._id)
          )
          .first();

        // Check if current user is following the reel author
        const follow = await ctx.db
          .query("follows")
          .withIndex("by_both", (q) =>
            q.eq("followerId", currentUser._id).eq("followingId", reel.userId)
          )
          .first();

        return {
          ...reel,
          author: {
            _id: reelAuthor?._id,
            username: reelAuthor?.username,
            image: reelAuthor?.image,
          },
          isLiked: !!like,
          isBookmarked: !!bookmark,
          isFollowing: !!follow,
          isOwnReel: currentUser._id === reel.userId,
        };
      })
    );

    return { reels: reelsWithInfo, currentUserId: currentUser._id };
  },
});

export const toggleLike = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_reel", (q) =>
        q.eq("userId", currentUser._id).eq("reelId", args.reelId)
      )
      .first();

    const reel = await ctx.db.get(args.reelId);
    if (!reel) throw new Error("Reel not found");

    if (existing) {
      // remove like
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.reelId, { likes: reel.likes - 1 });
      return false; // unliked
    } else {
      // add like
      await ctx.db.insert("likes", {
        userId: currentUser._id,
        reelId: args.reelId,
      });
      await ctx.db.patch(args.reelId, { likes: reel.likes + 1 });

      // if it's not my reel create a notification
      if (currentUser._id !== reel.userId) {
        await ctx.db.insert("notifications", {
          receiverId: reel.userId,
          senderId: currentUser._id,
          type: "like",
          reelId: args.reelId,
        });
      }
      return true; // liked
    }
  },
});

export const incrementViews = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const reel = await ctx.db.get(args.reelId);
    if (!reel) throw new Error("Reel not found");

    await ctx.db.patch(args.reelId, { views: reel.views + 1 });
  },
});

export const deleteReel = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const reel = await ctx.db.get(args.reelId);
    if (!reel) throw new Error("Reel not found");

    // verify ownership
    if (reel.userId !== currentUser._id) throw new Error("Not authorized to delete this reel");

    // delete associated likes
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // delete associated comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // delete associated bookmarks
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .collect();

    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // delete associated notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // delete the storage file
    await ctx.storage.delete(reel.storageId);

    // delete the reel
    await ctx.db.delete(args.reelId);

    // decrement user's post count by 1
    await ctx.db.patch(currentUser._id, {
      posts: Math.max(0, (currentUser.posts || 1) - 1),
    });
  },
});

export const getReelsByUser = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = args.userId ? await ctx.db.get(args.userId) : await getAuthenticatedUser(ctx);

    if (!user) throw new Error("User not found");

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_user", (q) => q.eq("userId", args.userId || user._id))
      .collect();

    return reels;
  },
});