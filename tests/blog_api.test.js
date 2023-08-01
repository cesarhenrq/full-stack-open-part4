const mongoose = require('mongoose');
const supertest = require('supertest');
const Blog = require('../models/blog');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helper = require('./test_helper');
const { SECRET } = require('../utils/config');
const app = require('../app');

const api = supertest(app);

let token;
let username;

beforeEach(async () => {
  await User.deleteMany({});
  await Blog.deleteMany({});

  const passwordHash = await bcrypt.hash('sekret', 10);
  const user = new User({ username: 'root', passwordHash });

  await user.save();

  const blogs = helper.initialBlogs.map((blog) => ({
    ...blog,
    user: user._id,
    _id: new mongoose.Types.ObjectId()
  }));

  await Blog.insertMany(blogs);

  await User.findByIdAndUpdate(user._id, {
    blogs: blogs.map((blog) => blog._id)
  });

  const response = await api
    .post('/api/login')
    .send({ username: 'root', password: 'sekret' });

  token = response.body.token;
  username = response.body.username;
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

  test('all blogs have a user property', async () => {
    const response = await api.get('/api/blogs');
    const blog = response.body[0];
    expect(blog.user).toBeDefined();
  });
});

describe('addition of a new blog', () => {
  test('succeeds with valid data', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      url: 'http://newblog.com',
      likes: 0
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart + 1);
  });

  test('with the likes property missing from the request, it will default to the value 0', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      url: 'http://newblog.com'
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    const addedBlog = blogsAtEnd.find((blog) => blog.title === 'New Blog');

    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(addedBlog.likes).toBe(0);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart + 1);
  });

  test('fails if the title propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const newBlog = {
      author: 'New Author',
      url: 'http://newblog.com',
      likes: 0
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('fails if the url propertie is missing from the request data, the backend responds to the request with the status code 400 Bad Request', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      likes: 0
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('fails if authorization token is missing', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      url: 'http://newblog.com',
      likes: 0
    };

    await api.post('/api/blogs').send(newBlog).expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('fails if authorization token is invalid', async () => {
    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    const token = jwt.sign({ username: 'invalid' }, SECRET);

    const newBlog = {
      title: 'New Blog',
      author: 'New Author',
      url: 'http://newblog.com',
      likes: 0
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });
});

describe('deletion of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    const usersAtStart = await helper.usersInDb();
    const userAtStart = usersAtStart.find((user) => user.username === username);
    const userBlogsAtStart = userAtStart.blogs.length;

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const titles = blogsAtEnd.map((blog) => blog.title);

    expect(titles).not.toContain(blogToDelete.title);

    const usersAtEnd = await helper.usersInDb();
    const userAtEnd = usersAtEnd.find((user) => user.username === username);
    const userBlogsAtEnd = userAtEnd.blogs.length;

    expect(userBlogsAtEnd).toBe(userBlogsAtStart - 1);
  });

  test('fails with status code 404 if id not exist', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const userAtStart = await helper.usersInDb();
    const userBlogsAtStart = userAtStart[0].blogs.length;

    const validNonexistingId = await helper.nonExistingId();

    await api
      .delete(`/api/blogs/${validNonexistingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const blogsAtEnd = await helper.blogsInDb();
    const userAtEnd = await helper.usersInDb();
    const userBlogsAtEnd = userAtEnd[0].blogs.length;

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
  });

  test('fails with status code 400 if id is invalid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const userAtStart = await helper.usersInDb();
    const userBlogsAtStart = userAtStart[0].blogs.length;

    const invalidId = '123456789';

    await api
      .delete(`/api/blogs/${invalidId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    const userAtEnd = await helper.usersInDb();
    const userBlogsAtEnd = userAtEnd[0].blogs.length;

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
  });

  test('fails with status code 400 if token is missing', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const userAtStart = await helper.usersInDb();
    const userBlogsAtStart = userAtStart[0].blogs.length;

    const blogToDelete = blogsAtStart[0];

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    const userAtEnd = await helper.usersInDb();
    const userBlogsAtEnd = userAtEnd[0].blogs.length;

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
  });

  test('fails with status code 401 if token is invalid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const userAtStart = await helper.usersInDb();
    const userBlogsAtStart = userAtStart[0].blogs.length;

    const blogToDelete = blogsAtStart[0];

    const token = jwt.sign({ username: 'invalid' }, SECRET);

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const blogsAtEnd = await helper.blogsInDb();
    const userAtEnd = await helper.usersInDb();
    const userBlogsAtEnd = userAtEnd[0].blogs.length;

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
  });

  test('fails with status code 401 if token is not the creator', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const userAtStart = await helper.usersInDb();
    const userBlogsAtStart = userAtStart[0].blogs.length;

    const blogToDelete = blogsAtStart[0];

    const token = jwt.sign(
      { username: 'not_creator', password: '121545' },
      SECRET,
      { expiresIn: 60 * 60 }
    );

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const blogsAtEnd = await helper.blogsInDb();
    const userAtEnd = await helper.usersInDb();
    const userBlogsAtEnd = userAtEnd[0].blogs.length;

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(userBlogsAtEnd).toBe(userBlogsAtStart);
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

describe('when there is initially one user in db', () => {
  test('users are returned as json', async () => {
    await api
      .get('/api/users')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });

  test('the unique identifier property of the user is named id', async () => {
    const response = await api.get('/api/users');
    const user = response.body[0];
    expect(user.id).toBeDefined();
  });
});

describe('addition of a new user', () => {
  test('succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen'
    };

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

    const usernames = usersAtEnd.map((u) => u.username);
    expect(usernames).toContain(newUser.username);
  });

  test('fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen'
    };

    const result = await api.post('/api/users').send(newUser).expect(400);

    const usersAtEnd = await helper.usersInDb();

    expect(result.body.error).toContain('`username` to be unique');
    expect(usersAtStart).toHaveLength(usersAtEnd.length);
  });

  test('fails with proper statuscode and message if username is missing', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      name: 'Superuser',
      password: 'salainen'
    };

    const result = await api.post('/api/users').send(newUser).expect(400);

    const usersAtEnd = await helper.usersInDb();

    expect(result.body.error).toContain('`username` is required');
    expect(usersAtStart).toHaveLength(usersAtEnd.length);
  });

  test('fails with proper statuscode and message if username is shorter than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'ro',
      name: 'Superuser',
      password: 'salainen'
    };

    const result = await api.post('/api/users').send(newUser).expect(400);

    const usersAtEnd = await helper.usersInDb();

    expect(result.body.error).toContain(
      'is shorter than the minimum allowed length (3)'
    );
    expect(usersAtStart).toHaveLength(usersAtEnd.length);
  });

  test('fails with proper statuscode and message if password is missing', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      name: 'Superuser',
      username: 'root'
    };

    const result = await api.post('/api/users').send(newUser).expect(400);

    const usersAtEnd = await helper.usersInDb();

    expect(result.body.error).toContain('password missing');
    expect(usersAtStart).toHaveLength(usersAtEnd.length);
  });

  test('fails with proper statuscode and message if password is shorter than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      name: 'Superuser',
      username: 'root',
      password: 'sa'
    };

    const result = await api.post('/api/users').send(newUser).expect(400);

    const usersAtEnd = await helper.usersInDb();

    expect(result.body.error).toContain('password must be at least 3');
    expect(usersAtStart).toHaveLength(usersAtEnd.length);
  });
});

describe('authentication of a user', () => {
  test('succeeds with valid credentials', async () => {
    const userToLogin = { username: 'root', password: 'sekret' };

    const userInDb = await User.findOne({ username: userToLogin.username });

    const result = await api.post('/api/login').send(userToLogin).expect(200);

    expect(result.body.token).toBeDefined();
    expect(result.body.username).toBe(userToLogin.username);
    expect(result.body.name).toBe(userInDb.name);
  });

  test('fails with proper statuscode and message if username is missing', async () => {
    const userToLogin = { password: 'sekret' };

    const result = await api.post('/api/login').send(userToLogin).expect(401);

    expect(result.body.error).toContain('invalid username or password');
  });

  test('fails with proper statuscode and message if password is missing', async () => {
    const userToLogin = { username: 'root' };

    const result = await api.post('/api/login').send(userToLogin).expect(401);

    expect(result.body.error).toContain('invalid username or password');
  });

  test('fails with proper statuscode and message if username is invalid', async () => {
    const userToLogin = { username: 'invalid', password: 'sekret' };

    const result = await api.post('/api/login').send(userToLogin).expect(401);

    expect(result.body.error).toContain('invalid username or password');
  });

  test('fails with proper statuscode and message if password is invalid', async () => {
    const userToLogin = { username: 'root', password: 'invalid' };

    const result = await api.post('/api/login').send(userToLogin).expect(401);

    expect(result.body.error).toContain('invalid username or password');
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
