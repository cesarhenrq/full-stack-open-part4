const mongoose = require('mongoose');
const supertest = require('supertest');
const Blog = require('../models/blog');
const helper = require('./test_helper');
const app = require('../app');

const api = supertest(app);

beforeEach(async () => {
  await Blog.deleteMany({});
  await Blog.insertMany(helper.initialBlogs);
});

describe('when there is initially some blogs saved', () => {
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
});

describe('addition of a new blog', () => {
  test('succeeds with valid data', async () => {
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

  test('with the likes property missing from the request, it will default to the value 0', async () => {
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

  test('fails if the title propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
    const newBlog = {
      author: 'New Author',
      url: 'http://newblog.com',
      likes: 0
    };

    await api.post('/api/blogs').send(newBlog).expect(400);
  });

  test('fails if the url propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      likes: 0
    };

    await api.post('/api/blogs').send(newBlog).expect(400);
  });
});

describe('deletion of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const titles = blogsAtEnd.map((blog) => blog.title);

    expect(titles).not.toContain(blogToDelete.title);
  });

  test('fails with status code 404 if id not exist', async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api.delete(`/api/blogs/${validNonexistingId}`).expect(404);
  });

  test('fails with status code 400 if id is invalid', async () => {
    const invalidId = '123456789';

    await api.delete(`/api/blogs/${invalidId}`).expect(400);
  });
});

describe('updating a blog', () => {
  test('succeeds with status code 200 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToUpdate = blogsAtStart[0];

    const updatedBlog = {
      likes: 50
    };

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updatedBlog)
      .expect(200);

    const blogsAtEnd = await helper.blogsInDb();

    const updatedBlogInDb = blogsAtEnd.find(
      (blog) => blog.id === blogToUpdate.id
    );

    expect(updatedBlogInDb.likes).toBe(50);
  });

  test('fails with status code 404 if id not exist', async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api
      .put(`/api/blogs/${validNonexistingId}`)
      .send({ likes: 50 })
      .expect(404);
  });

  test('fails with status code 400 if id is invalid', async () => {
    const invalidId = '123456789';

    await api.put(`/api/blogs/${invalidId}`).send({ likes: 50 }).expect(400);
  });

  test('fails with status code 400 if likes is not convertable to a number', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToUpdate = blogsAtStart[0];

    const updatedBlog = {
      likes: ['50']
    };

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updatedBlog)
      .expect(400);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
