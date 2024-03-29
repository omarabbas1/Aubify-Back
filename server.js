const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 8080;
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const Post = require('./models/Post'); // Adjust the path as necessary based on your project structure
const Comment = require('./models/Comment'); // Adjust the path according to your project structure


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
    user: 'Aubify10@outlook.com', // Use environment variables
    pass: 'LamdaDev@2024', // Use environment variables
  },
});

// Function to find user by email and return their name
const findUserNameByEmail = async (email) => {
  try {
    const user = await User.findOne({ email: email });
    if (user) {
      return user.name; // Assuming 'name' is the field for the user's name
    } else {
      return null; // User not found
    }
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error; // Re-throw the error to handle it in the calling function
  }
};


const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: 'Aubify10@outlook.com',
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

app.post('/handleSignin', async (req, res) => {
  const { email } = req.body;
  try {
    // Assuming you have a function that finds the user by email and returns their name
    const userName = await findUserNameByEmail(email);
    if (userName) {
      res.json({ success: true, userName });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user name:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/handleSignup', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email }).exec();
    if (user) {
      // Send back the userName and emailVerified status after finding the user
      res.json({ success: true, userName: user.name, emailVerified: user.emailVerified });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user name:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/posts', async (req, res) => {
  const { title, content, userEmail } = req.body; // Now expecting userEmail to identify the user

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Assuming you have a User model where each user has a posts array
    const newPost = new Post({ title, content, author: user._id }); // Set the author of the post
    await newPost.save();

    // Now, add this post to the user's posts array
    user.posts.push(newPost._id); // Add the post's ID to the user's posts array
    await user.save(); // Save the user with the updated posts array

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, userEmail } = req.body;

    if (!content || !userEmail) {
      return res.status(400).send('Content and userEmail are required.');
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Retrieve the anonymous ID from the user object
    const { anonymousId } = user;

    const newComment = await Comment.create({
      content: content,
      author: user._id,
      authorAnonymousId: anonymousId, // Add anonymousId to the comment
      upvotedBy: [],
      downvotedBy: []
    });

    post.comments.push(newComment._id);
    await post.save();

    // Populate comments and their authors
    await post.populate({
      path: 'comments',
      populate: { path: 'author', select: 'email' }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Internal server error');
  }
});


// Function to fetch posts sorted by upvotes (relevance)
const fetchPostsByRelevance = async () => {
  return await Post.find().sort({ upvotes: -1, createdAt: -1 });
};


// Function to fetch posts sorted by date added (most recent)
const fetchPostsByDate = async () => {
  return await Post.find().sort({ createdAt: -1 }); // Assuming your Post model has a createdAt field
};

app.get('/posts', async (req, res) => {
  const filter = req.query.filter;
  try {
    let posts;
    if (filter === 'relevance') {
      posts = await fetchPostsByRelevance();
    } else if (filter === 'date_added') {
      posts = await fetchPostsByDate();
    } else {
      // Default to relevance if filter is not specified or is unknown
      posts = await fetchPostsByRelevance();
    }
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Internal server error');
  }
});


app.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    // Fetch the post by ID
    const post = await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'anonymousId' } // Populate each comment's author's anonymousId
      })
      .populate('author', 'anonymousId') // Populate the post's author's anonymousId
      .exec();

    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Optional: Convert post to JSON if you need to modify it before sending
    const postJSON = post.toJSON();

    // Respond with the post data
    res.json(postJSON);
  } catch (error) {
    console.error('Failed to fetch post:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/posts/:postId/upvote', async (req, res) => {
  const { postId } = req.params;
  const {userEmail} = req.body; // Assuming you have user's email from the session or token

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    const userId = user._id;
    if (post.upvotedBy.includes(userId)) {
      return res.status(409).send('You have already upvoted this post.');
    }

    if (post.downvotedBy.includes(userId)) {
      post.downvotes -= 1;
      post.downvotedBy = post.downvotedBy.filter(id => id.toString() !== userId.toString());
    }

    post.upvotes += 1;
    post.upvotedBy.push(userId);
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error upvoting post:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/posts/:postId/downvote', async (req, res) => {
  const { postId } = req.params;
  const {userEmail} = req.body; // Assuming you have user's email from the session or token

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    const userId = user._id;
    if (post.downvotedBy.includes(userId)) {
      return res.status(409).send('You have already downvoted this post.');
    }

    if (post.upvotedBy.includes(userId)) {
      post.upvotes -= 1;
      post.upvotedBy = post.upvotedBy.filter(id => id.toString() !== userId.toString());
    }

    post.downvotes += 1;
    post.downvotedBy.push(userId);
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error downvoting post:', error);
    res.status(500).send('Internal server error');
  }
});

// Endpoint for upvoting a comment
app.post('/posts/:postId/comments/:commentId/upvote', async (req, res) => {
  const { postId, commentId } = req.params;
  const { userEmail } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Find the comment within the post
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    // Check if the user has already upvoted the comment
    if (comment.upvotedBy.includes(user._id)) {
      return res.status(409).send('You have already upvoted this comment.');
    }

    // Check if the user has downvoted the comment, if so, remove the downvote
    if (comment.downvotedBy.includes(user._id)) {
      comment.downvotes -= 1;
      comment.downvotedBy.pull(user._id);
    }

    // Upvote the comment
    comment.upvotes += 1;
    comment.upvotedBy.push(user._id);

    // Save the updated comment
    await comment.save();

    res.status(200).json(comment); // Optionally, return the updated comment
  } catch (error) {
    console.error('Error upvoting comment:', error);
    res.status(500).send('Internal server error');
  }
});

// Endpoint for downvoting a comment
app.post('/posts/:postId/comments/:commentId/downvote', async (req, res) => {
  const { postId, commentId } = req.params;
  const { userEmail } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Find the comment within the post
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    // Check if the user has already downvoted the comment
    if (comment.downvotedBy.includes(user._id)) {
      return res.status(409).send('You have already downvoted this comment.');
    }

    // Check if the user has upvoted the comment, if so, remove the upvote
    if (comment.upvotedBy.includes(user._id)) {
      comment.upvotes -= 1;
      comment.upvotedBy.pull(user._id);
    }

    // Downvote the comment
    comment.downvotes += 1;
    comment.downvotedBy.push(user._id);

    // Save the updated comment
    await comment.save();

    res.status(200).json(comment); // Optionally, return the updated comment
  } catch (error) {
    console.error('Error downvoting comment:', error);
    res.status(500).send('Internal server error');
  }
});



app.post('/checkCurrentPassword', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Compare provided password with the stored hashed password
  const match = await bcrypt.compare(password, user.password);
  if (match) {
    res.json({ currentPasswordMatch: true });
  } else {
    res.json({ currentPasswordMatch: false });
  }
});

// Route to save new password
app.post('/saveNewPassword', async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await User.findOne({ email: email });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Hash the new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update the user's password hash
  // In a real application, this would involve updating the database
  user.password = newPasswordHash;
  await User.updateOne({ email: email }, { $set: { password: newPasswordHash } });

  res.json({ message: 'New password saved successfully' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

});

app.get('/user/posts', async (req, res) => {
  const { email } = req.query; // Get the email from query parameters

  try {
    // First, find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Then, find all posts authored by that user
    const posts = await Post.find({ author: user._id }).populate('author', 'name email');

    // Return the posts to the client
    res.json(posts);
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/posts/:postId/author/anonymousId', async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).send({ message: "Invalid Post ID format." });
  }
    const post = await findPostById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ anonymousId: post.author.anonymousId });
  } catch (error) {
    console.error('Error fetching author\'s anonymous ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function findPostById(postId) {
  try {
    const post = await Post.findById(postId)
      .populate('author')

    if (!post) {
      console.log('No post found with the given ID.');
      return null;
    }

    return post;
  } catch (error) {
    console.error('Error finding post by ID:', error);
    throw error; // Rethrowing the error might be helpful if you want calling functions to handle it
  }
}