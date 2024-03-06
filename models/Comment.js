const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: String,
//   author: String, // Optional, depending on your requirements
  createdAt: { type: Date, default: Date.now },
});