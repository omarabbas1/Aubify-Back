const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  // Use an array of ObjectIds referencing 'Comment' documents
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],  
  reported: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;