const Blog = require('../models/blog');

const initialBlogs = [
  {
    title: 'Test Blog 1',
    author: 'Test Author 1',
    url: 'http://www.testblog1.com',
    likes: 1
  },
  {
    title: 'Test Blog 2',
    author: 'Test Author 2',
    url: 'http://www.testblog2.com',
    likes: 2
  }
];

const nonExistingId = async () => {
  const blog = new Blog({
    title: 'Test Blog 3',
    author: 'Test Author 3',
    url: 'http://www.testblog3.com',
    likes: 3
  });

  await blog.save();

  await blog.remove();

  return blog._id.toString();
};

const blogsInDb = async () => {
  const blogs = await Blog.find({});
  return blogs.map((blog) => blog.toJSON());
};

module.exports = { initialBlogs, nonExistingId, blogsInDb };
