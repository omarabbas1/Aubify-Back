const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Ensures that each email is unique
  },
  password: {
    type: String,
    required: true
  }
});

// Create the User model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User; // Export the User model