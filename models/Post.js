const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    content: String,
    // author: String, // Optional
    createdAt: { type: Date, default: Date.now },
    comments: [CommentSchema],
  });