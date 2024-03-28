const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose); // You'll need the mongoose-sequence plugin

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
  },
  accountCreated: {
    type: Date,
    default: Date.now // Automatically sets to the current date and time
  },
  anonymousId: {
    type: String,
    unique: true // Ensures the anonymousId is unique
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }]
});

// Use the mongoose-sequence plugin to auto-increment the anonymousId field
userSchema.plugin(AutoIncrement, {inc_field: 'anonymousNumber'});

// A pre-save hook to format the anonymousId field as "Anonymous#0000"
userSchema.pre('save', function(next) {
  this.anonymousId = `Anonymous#${String(this.anonymousNumber)}`;
  next();
});

User = mongoose.model('User', userSchema);

module.exports = User;


User = mongoose.model('User', userSchema);

module.exports = User;