const mongoose = require('mongoose');
const supertest = require('supertest');
const Blog = require('../models/blog');
const helper = require('./test_helper');
const app = require('../app');

const api = supertest(app);

beforeEach(async () => {
  await Blog.deleteMany({});

  const blogObjects = helper.initialBlogs.map((blog) => new Blog(blog));
  const promiseArray = blogObjects.map((note) => note.save());
  await Promise.all(promiseArray);
});

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/);
});

test('the unique identifier property of the blog posts is named id', async () => {
  const response = await api.get('/api/blogs');
  const blog = response.body[0];
  expect(blog.id).toBeDefined();
});

test('a valid blog can be added', async () => {
  const newBlog = {
    title: 'New Blog',
    author: 'New Author',
    url: 'http://newblog.com',
    likes: 0
  };

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const blogsAtEnd = await helper.blogsInDb();

  const addedBlog = blogsAtEnd.find((blog) => blog.title === 'New Blog');
  delete addedBlog.id;

  expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
  expect(addedBlog).toEqual(newBlog);
});

test('if the likes property is missing from the request, it will default to the value 0', async () => {
  const newBlog = {
    title: 'New Blog',
    author: 'New Author',
    url: 'http://newblog.com'
  };

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const blogsAtEnd = await helper.blogsInDb();

  const addedBlog = blogsAtEnd.find((blog) => blog.title === 'New Blog');

  expect(addedBlog.likes).toBe(0);
});

test('if the title propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
  const newBlog = {
    author: 'New Author',
    url: 'http://newblog.com',
    likes: 0
  };

  await api.post('/api/blogs').send(newBlog).expect(400);
});

test('if the url propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
  const newBlog = {
    title: 'New Blog',
    author: 'New Author',
    likes: 0
  };

  await api.post('/api/blogs').send(newBlog).expect(400);
});

afterAll(async () => {
  await mongoose.connection.close();
});
