const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import CORS middleware
const app = express();
const PORT = 8080;

// Import User model
const User = require('./models/User');

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cors()); // Enable CORS for all routes

// MongoDB connection
mongoose.connect('mongodb+srv://admin:admin271*@cluster.wtbgcs2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.post('/checkUserExists', (req, res) => {
  // Extract email from the request body
  const { email } = req.body;

  // For the sake of demonstration, let's assume you have a User model and you want to check if the email exists in the database
  User.findOne({ email: email }, (err, user) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // If user is found, return exists: true, otherwise return exists: false
    if (user) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  });
});

// Define a route to handle the checkPassword request
app.post('/checkPassword', (req, res) => {
  // Extract email and password from the request body
  const { email, password } = req.body;

  // Here you would perform your logic to check if the provided password matches the password associated with the given email in your database
  // For the sake of demonstration, let's assume you have a User model and you want to check if the password matches the email in the database
  User.findOne({ email: email, password: password }, (err, user) => {
    if (err) {
      console.error('Error checking password:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // If user is found and password matches, return correctPassword: true, otherwise return correctPassword: false
    if (user) {
      return res.json({ correctPassword: true });
    } else {
      return res.json({ correctPassword: false });
    }
  });
});

app.post('/saveUserData', async (req, res) => {
  // Extract name, email, and password from the request body
  const { name, email, password } = req.body;

  // Here you would save the user data to your database
  // For the sake of demonstration, let's assume you have a User model and you want to save the user data to the database
  const newUser = new User({ name, email, password });

  try {
    // Save the user data to the database
    await newUser.save();
    // Handle success if needed
    console.log('User data saved successfully!');
    return res.status(200).json({ message: 'User data saved successfully' });
  } catch (error) {
    console.error('Error saving user data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});