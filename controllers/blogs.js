const blogsRouter = require('express').Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { SECRET } = require('../utils/config');

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({});
  response.json(blogs);
});

blogsRouter.post('/', async (request, response) => {
  const body = request.body;

  const decodedToken = jwt.verify(request.token, SECRET);

  if (!decodedToken.id) {
    const error = new Error('token missing or invalid');
    error.name = 'UnauthorizedError';
    throw error;
  }
  const user = await User.findById(decodedToken.id);

  const blog = new Blog({
    ...body,
    user: user._id
  });

  const savedBlog = await blog.save();

  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.status(201).json(savedBlog);
});

blogsRouter.delete('/:id', async (request, response) => {
  const id = request.params.id;

  const removedBlog = await Blog.findByIdAndRemove(id);

  if (removedBlog) {
    return response.status(204).end();
  }

  response.status(404).end();
});

blogsRouter.put('/:id', async (request, response) => {
  const id = request.params.id;

  const updatedBlog = await Blog.findByIdAndUpdate(id, request.body, {
    new: true
  });

  if (updatedBlog) {
    return response.json(updatedBlog);
  }

  response.status(404).end();
});

module.exports = blogsRouter;
