const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import CORS middleware
const app = express();
const PORT = 8080;
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Import User model
const User = require('./models/User');

// Configure Nodemailer
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: 'lamdadev9@outlook.com', // Use environment variables
    pass: 'LamdaDev2024', // Use environment variables
  },
});

const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: 'lamdadev9@outlook.com',
    to: email,
    subject: 'Verify Your Email',
    text: `Your verification code is: ${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully.');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

app.post('/checkUserExists', async (req, res) => {
  const { email } = req.body;
  try {
    const userExists = await User.exists({ email });
    res.json({ exists: !!userExists }); // Convert to boolean
  } catch (error) {
    console.error('Error checking user existence:', error);
    res.status(500).json({ exists: false });
  }
});

app.post('/checkPassword', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      // Use bcrypt to compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, user.password);
      res.json({ correctPassword: isMatch });
    } else {
      res.json({ correctPassword: false }); 
      
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ correctPassword: false });
  }
});

app.post('/saveUserData', async (req, res) => {
  const { name, email, password } = req.body;
  // Generate a simple verification code
  const verificationCode = Math.random().toString(36).substring(2, 8);

  try {
    // Hash the password before saving
    const saltRounds = 10; // You can adjust the cost factor as needed
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user with the verification code and hashed password
    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Store the hashed password
      emailVerified: false,
      temporaryVerificationCode: verificationCode,
    });

    // Save the new user
    await newUser.save();

    // Send the verification email with the code
    await sendVerificationEmail(email, verificationCode);

    // Respond to the request
    res.status(201).send('User registered, verification email sent.');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Error registering user.');
  }
});


app.post('/verifyEmail', async (req, res) => {
  const { verificationCode } = req.body;

  try {
    const user = await User.findOne({ temporaryVerificationCode: verificationCode });
    if (user) {
      user.emailVerified = true;
      user.temporaryVerificationCode = null;
      await user.save();
      res.send('Email verified successfully.');
    } else {
      res.status(400).send('Invalid verification code.');
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Server error during verification.');
  }
});

app.post('/checkUserVerified', async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user in the database by email
    const user = await User.findOne({ email });

    // If the user is found and is verified, send back a response indicating so
    if (user && user.emailVerified) {
      res.json({ isVerified: true });
    } else {
      // If the user is not found or not verified, send back a response indicating so
      res.json({ isVerified: false });
    }
  } catch (error) {
    console.error('Error checking user verification status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

});