import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const addComment = mutation({
  args: {
    content: v.string(),
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

    let targetUserId: Id<"users">;

    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post) throw new ConvexError("Post not found");
      targetUserId = post.userId;
      
      // increment comment count by 1
      await ctx.db.patch(args.postId, { comments: post.comments + 1 });
    } else {
      const reel = await ctx.db.get(args.reelId!);
      if (!reel) throw new ConvexError("Reel not found");
      targetUserId = reel.userId;
      
      // increment comment count by 1
      await ctx.db.patch(args.reelId!, { comments: reel.comments + 1 });
    }

    const commentId = await ctx.db.insert("comments", {
      userId: currentUser?._id,
      postId: args.postId,
      reelId: args.reelId,
      content: args.content,
    });

    // create a notification if it's not my own post/reel
    if (targetUserId !== currentUser._id) {
      await ctx.db.insert("notifications", {
        receiverId: targetUserId,
        senderId: currentUser._id,
        type: "comment",
        postId: args.postId,
        reelId: args.reelId,
        commentId
      });
    }

    return commentId;
  },
});

export const getComments = query({
  args: { 
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
  },
  handler: async (ctx, args) => {
    if (!args.postId && !args.reelId) {
      throw new ConvexError("Either postId or reelId must be provided");
    }

    let comments;
    if (args.postId) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .collect();
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
        .collect();
    }

    const commentsWithInfo = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: {
            fullname: user!.fullname,
            image: user!.image,
          },
        };
      })
    );

    return commentsWithInfo;
  },
});