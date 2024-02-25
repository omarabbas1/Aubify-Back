const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json()); // Parse JSON requests

// MongoDB connection
mongoose.connect('mongodb+srv://admin:admin271*@cluster.wtbgcs2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});