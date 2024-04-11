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
const Feedback = require('./models/Feedback'); // Make sure the path matches your project structure



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
  const { userEmail, title, content } = req.body;
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).send('User not found');

    if (!canSubmit(user.lastPostTimestamps)) {
      return res.status(429).send('Post submission limit reached. Please try again later.');
    }

    // Create the new post
    const newPost = new Post({ title, content, author: user._id });
    await newPost.save();

    // Add the post's ObjectId to the user's posts array and update the timestamps
    user.posts.push(newPost._id);
    user.lastPostTimestamps = addTimestamp(user.lastPostTimestamps);

    // Save the updated user document
    await user.save(); // Ensure this is awaited

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { content, userEmail } = req.body;

  if (!content || !userEmail) {
    return res.status(400).send('Content and userEmail are required.');
  }

  try {
    const user = await User.findOne({ email: userEmail });
    const post = await Post.findById(postId);

    if (!user || !post) {
      return res.status(404).send('User or post not found');
    }

    // Check if the user has already commented 4 times on this post in the last 24 hours
    const commentLimitEntry = user.commentTimestamps.find(entry => entry.post.toString() === postId);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    if (commentLimitEntry) {
      // Filter out timestamps older than 24 hours
      const recentTimestamps = commentLimitEntry.timestamps.filter(timestamp => timestamp > oneDayAgo);

      if (recentTimestamps.length >= 4) {
        return res.status(429).send('Comment limit reached for today on this post.');
      }

      commentLimitEntry.timestamps.push(now);
    } else {
      // If no entry exists for this post, create one
      user.commentTimestamps.push({ post: post._id, timestamps: [now] });
    }
    
    user.markModified('commentTimestamps');
    await user.save();

    // Proceed to save the comment
    const newComment = new Comment({
      content: content,
      author: user._id,
      post: post._id
    });

    await newComment.save();

    // Optionally, push and save the comment ID to the post document
    post.comments.push(newComment._id);
    await post.save();

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Failed to post comment:', error);
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
        options: { sort: { 'upvotes': -1 } }, // Add this line to sort comments by upvotes
        populate: { path: 'author', select: 'anonymousId' } // Assuming you're populating author details
      })
      .populate('author', 'anonymousId') // Populate the post's author's anonymousId
      .exec();

    if (!post) {
      return res.status(404).send('Post not found');
    }

    res.json(post);
  } catch (error) {
    console.error('Failed to fetch post:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/posts/:postId/upvote', async (req, res) => {
  const { postId } = req.params;
  const { userEmail } = req.body; // Assuming you have user's email from the session or token

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
    // Check if the user already upvoted the post
    if (post.upvotedBy.includes(userId)) {
      // User re-presses upvote, so remove their upvote
      post.upvotes -= 1;
      post.upvotedBy = post.upvotedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Add upvote if not already upvoted
      if (post.downvotedBy.includes(userId)) {
        // If previously downvoted, first remove the downvote
        post.downvotes -= 1;
        post.downvotedBy = post.downvotedBy.filter(id => id.toString() !== userId.toString());
      }
      post.upvotes += 1;
      post.upvotedBy.push(userId);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error upvoting post:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/posts/:postId/downvote', async (req, res) => {
  const { postId } = req.params;
  const { userEmail } = req.body;

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
    // Check if the user already downvoted the post
    if (post.downvotedBy.includes(userId)) {
      // User re-presses downvote, so remove their downvote
      post.downvotes -= 1;
      post.downvotedBy = post.downvotedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Add downvote if not already downvoted
      if (post.upvotedBy.includes(userId)) {
        // If previously upvoted, first remove the upvote
        post.upvotes -= 1;
        post.upvotedBy = post.upvotedBy.filter(id => id.toString() !== userId.toString());
      }
      post.downvotes += 1;
      post.downvotedBy.push(userId);
    }

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
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    const userId = user._id;
    if (comment.upvotedBy.includes(userId)) {
      // User re-presses upvote, so remove their upvote
      comment.upvotes -= 1;
      comment.upvotedBy.pull(userId);
    } else {
      // Add upvote if not already upvoted
      if (comment.downvotedBy.includes(userId)) {
        // If previously downvoted, first remove the downvote
        comment.downvotes -= 1;
        comment.downvotedBy.pull(userId);
      }
      comment.upvotes += 1;
      comment.upvotedBy.push(userId);
    }

    await comment.save();
    res.status(200).json(comment);
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
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    const userId = user._id;
    if (comment.downvotedBy.includes(userId)) {
      // User re-presses downvote, so remove their downvote
      comment.downvotes -= 1;
      comment.downvotedBy.pull(userId);
    } else {
      // Add downvote if not already downvoted
      if (comment.upvotedBy.includes(userId)) {
        // If previously upvoted, first remove the upvote
        comment.upvotes -= 1;
        comment.upvotedBy.pull(userId);
      }
      comment.downvotes += 1;
      comment.downvotedBy.push(userId);
    }

    await comment.save();
    res.status(200).json(comment);
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
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).send({ message: "Invalid Post ID format." });
  }

  try {
    // Fetch the post by ID to get the author field
    const post = await findPostById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // The author is populated, so you have access to all user fields
    const author = post.author;
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Respond with the anonymous ID, ignoring the submission limit
    res.json({ anonymousId: author.anonymousId });
  } catch (error) {
    console.error(`Error fetching author's anonymous ID:`, error);
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

app.get('/user/avatar', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email: email }).exec();
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json({ avatarUrl: user.avatarUrl }); // Assuming user document has an avatarUrl field
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/user/update-avatar', async (req, res) => {
  const { email, avatarUrl } = req.body;

  try {
    const user = await User.findOneAndUpdate({ email: email }, { avatarUrl: avatarUrl }, { new: true });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.send('Avatar updated successfully');
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/user/date-created', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email: email }).exec();
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    const accountCreated = user.accountCreated;

    const month = (accountCreated.getMonth() + 1).toString().padStart(2, '0'); // Adding 1 to get the correct month index
    const day = accountCreated.getDate().toString().padStart(2, '0');
    const year = accountCreated.getFullYear();

    // Format the date as mm-dd-yyyy
    const formattedDate = `${month}/${day}/${year}`;

    res.json({ dateCreated: formattedDate });
  } catch (error) {
    console.error('Failed to fetch date created:', error);
    res.status(500).send('Internal server error');
  }
});

// Route to fetch feedback list
app.get('/getFeedbackList', async (req, res) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 }); // Fetch all feedback, newest first
    res.json(feedbackList);
  } catch (error) {
    console.error('Error fetching feedback list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to send (save) feedback
app.post('/sendFeedback', async (req, res) => {
  const { email, message } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found');

    if (!canSubmit(user.lastFeedbackTimestamps)) {
      return res.status(429).send('Feedback submission limit reached. Please try again later.');
    }

    const newFeedback = new Feedback({ email, message });
    await newFeedback.save();

    user.lastFeedbackTimestamps = addTimestamp(user.lastFeedbackTimestamps);
    await user.save(); // Make sure to await the save operation

    res.status(201).json({ message: 'Feedback sent successfully.' });
  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Utility functions (Place these inside your main server file or a separate utilities file)

const MAX_SUBMISSIONS = 4;
const SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Removes timestamps older than 24 hours and checks if a new submission is allowed
const canSubmit = (timestamps) => {
  const now = new Date();
  const recentTimestamps = timestamps.filter(timestamp => now - timestamp < SUBMISSION_WINDOW_MS);
  return recentTimestamps.length < MAX_SUBMISSIONS;
};

// Add a new timestamp to the array (ensuring it doesn't exceed the max length)
const addTimestamp = (timestamps) => {
  const now = new Date();
  timestamps.push(now);
  // Ensure we only keep the relevant timestamps within the 24-hour window
  return timestamps.slice(-MAX_SUBMISSIONS);
};

// Assuming you have an authentication middleware that sets `req.user`
app.get('/checkAdminStatus', async (req, res) => {
  const { userEmail } = req.query; // Get the userEmail from query parameters

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json({ isAdmin: user.isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).send('Internal server error');
  }
});

// Assuming you have a Post model imported at the top
// const Post = require('./models/Post');

app.get('/reportedPosts', async (req, res) => {
  try {
    const reportedPosts = await Post.find({ "reportedBy.0": { $exists: true } }) // This finds posts with at least one report
                                      .select('title reportedBy')
                                      .exec();
    res.json(reportedPosts);
  } catch (error) {
    console.error('Failed to fetch reported posts:', error);
    res.status(500).send('Internal server error');
  }
});


app.post('/posts/:postId/report', async (req, res) => {
  const { postId } = req.params;
  const { userEmail } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Check if the user has already reported the post
    const index = post.reportedBy.indexOf(user._id);
    let action = '';
    if (index === -1) {
      // User hasn't reported the post yet, add them to the reportedBy array
      post.reportedBy.push(user._id);
      action = 'add';
    } else {
      // User has already reported the post, remove them from the reportedBy array
      post.reportedBy.splice(index, 1);
      action = 'remove';
    }

    await post.save();
    res.json({ message: `Report ${action === 'add' ? 'added' : 'removed'} successfully.`, action: action });
  } catch (error) {
    console.error('Error toggling report status:', error);
    res.status(500).send('Internal server error');
  }
});

// server.js or a relevant file in your backend structure
app.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const { userEmail } = req.body; // Assuming you're passing the userEmail in the request body

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user || !user.isAdmin) {
      return res.status(403).send('Unauthorized: Only admins can delete posts.');
    }

    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).send('Post not found.');
    }

    // Optionally, you might want to delete comments associated with the post or handle other cleanup here.

    res.send('Post deleted successfully.');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Internal server error.');
  }
});
// DELETE /posts/:postId - Delete a post
app.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const userEmail = req.body.userEmail; // Assuming the userEmail is passed in the body for identification

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found.');
    }

    // Optionally, check if the post belongs to the user making the request
    if (post.authorEmail !== userEmail) {
      return res.status(403).send('You can only delete your own posts.');
    }

    await Post.deleteOne({ _id: postId });
    res.send('Post deleted successfully.');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Internal server error.');
  }
});


