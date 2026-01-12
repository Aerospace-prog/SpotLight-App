import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const toggleBookmark = mutation({
  args: { 
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    if (!args.postId && !args.reelId) {
      throw new ConvexError("Either postId or reelId must be provided");
    }

    if (args.postId && args.reelId) {
      throw new ConvexError("Cannot provide both postId and reelId");
    }

    let existing;
    if (args.postId) {
      existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_and_post", (q) =>
          q.eq("userId", currentUser._id).eq("postId", args.postId)
        )
        .first();
    } else {
      existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_and_reel", (q) =>
          q.eq("userId", currentUser._id).eq("reelId", args.reelId)
        )
        .first();
    }

    if (existing) {
      // remove bookmark
      await ctx.db.delete(existing._id);
      return false; // unbookmarked
    } else {
      // add bookmark
      await ctx.db.insert("bookmarks", {
        userId: currentUser._id,
        postId: args.postId,
        reelId: args.reelId,
      });
      return true; // bookmarked
    }
  },
});

export const getBookmarkedPosts = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const bookmarkedItems = await Promise.all(
      bookmarks.map(async (bookmark) => {
        if (bookmark.postId) {
          const post = await ctx.db.get(bookmark.postId);
          if (post) {
            const author = await ctx.db.get(post.userId);
            return {
              type: "post" as const,
              ...post,
              author: {
                _id: author?._id,
                username: author?.username,
                image: author?.image,
              },
            };
          }
        } else if (bookmark.reelId) {
          const reel = await ctx.db.get(bookmark.reelId);
          if (reel) {
            const author = await ctx.db.get(reel.userId);
            return {
              type: "reel" as const,
              ...reel,
              author: {
                _id: author?._id,
                username: author?.username,
                image: author?.image,
              },
            };
          }
        }
        return null;
      })
    );

    return bookmarkedItems.filter(Boolean);
  },
});