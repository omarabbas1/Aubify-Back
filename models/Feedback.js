const mongoose = require('mongoose');

// Define the schema for feedback
const feedbackSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true // Automatically trim whitespace around the email
  },
  message: {
    type: String,
    required: true,
    trim: true // Automatically trim whitespace around the message
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically set to the current date and time
  }
});

// Compile and export the model
module.exports = mongoose.model('Feedback', feedbackSchema);
