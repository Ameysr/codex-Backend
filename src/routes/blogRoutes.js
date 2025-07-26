const express = require('express');
const blogRoutes = express.Router();
const {toggleLike,createBlog,addComment,getBlogById,getAllBlogs} = require('../controllers/blogController');
const userMiddleware = require('../middleware/userMiddleware'); // Your authentication middleware

// Create a blog (protected)
blogRoutes.post('/', userMiddleware, createBlog);

// Get all blogs (public)
blogRoutes.get('/', getAllBlogs);

// Get single blog (public)
blogRoutes.get('/:id', getBlogById);

// Add comment to blog (protected)
blogRoutes.post('/:id/comments', userMiddleware, addComment);

// Like/unlike a blog (protected)
blogRoutes.post('/:id/like', userMiddleware, toggleLike);

module.exports = blogRoutes;