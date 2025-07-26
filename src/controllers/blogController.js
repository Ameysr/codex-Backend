const Blog = require('../models/blog');
const User = require('../models/user');

// Create a new blog
const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    const author = req.result._id; // From middleware

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    const blog = new Blog({
      title,
      content,
      author
    });

    await blog.save();

    // Add blog to user's blogs array
    await User.findByIdAndUpdate(author, {
      $push: { blogs: blog._id }
    });

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all blogs with pagination and author details
const getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'firstName lastName')
      .populate({
        path: 'comments.user',
        select: 'firstName lastName'
      });

    const total = await Blog.countDocuments();

    res.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single blog with detailed information
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'firstName lastName')
      .populate('likes', 'firstName lastName')
      .populate({
        path: 'comments.user',
        select: 'firstName lastName'
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add a comment to a blog
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const blogId = req.params.id;
    const userId = req.result._id; // From middleware

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $push: {
          comments: {
            user: userId,
            text
          }
        }
      },
      { new: true }
    )
      .populate('author', 'firstName lastName')
      .populate({
        path: 'comments.user',
        select: 'firstName lastName'
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Like/unlike a blog
const toggleLike = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.result._id; // From middleware

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    const likeIndex = blog.likes.indexOf(userId);

    if (likeIndex === -1) {
      // Like the blog
      blog.likes.push(userId);
    } else {
      // Unlike the blog
      blog.likes.splice(likeIndex, 1);
    }

    const updatedBlog = await blog.save();
    const populatedBlog = await Blog.populate(updatedBlog, [
      { path: 'author', select: 'firstName lastName' },
      { path: 'likes', select: 'firstName lastName' },
      { path: 'comments.user', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      data: populatedBlog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {toggleLike,createBlog,addComment,getBlogById,getAllBlogs};

