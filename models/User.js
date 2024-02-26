const mongoose = require('mongoose');

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
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false // New users are not verified
  },
  temporaryVerificationCode: {
    type: String,
    required: false // This can be null or omitted if not used
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;