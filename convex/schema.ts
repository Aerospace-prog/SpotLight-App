import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(), 
    fullname: v.string(), 
    email: v.string(),
    bio: v.optional(v.string()),
    image: v.string(),
    followers: v.number(),
    following: v.number(),
    posts: v.number(),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"), 
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
  }).index("by_user", ["userId"]),

  reels: defineTable({
    userId: v.id("users"),
    videoUrl: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
    views: v.number(),
    duration: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
  })
    .index("by_post", ["postId"])
    .index("by_reel", ["reelId"])
    .index("by_user_and_post", ["userId", "postId"])
    .index("by_user_and_reel", ["userId", "reelId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
    content: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_reel", ["reelId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
    commentId: v.optional(v.id("comments"))
  })
    .index("by_receiver", ["receiverId"])
    .index("by_post", ["postId"])
    .index("by_reel", ["reelId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.optional(v.id("posts")),
    reelId: v.optional(v.id("reels")),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_reel", ["reelId"])
    .index("by_user_and_post", ["userId", "postId"])
    .index("by_user_and_reel", ["userId", "reelId"]),
});