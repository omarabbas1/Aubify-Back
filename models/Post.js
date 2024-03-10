const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  comments: [String] // Changed to an array of strings
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
