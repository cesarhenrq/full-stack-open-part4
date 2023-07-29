// eslint-disable-next-line no-unused-vars
const dummy = (_blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + blog.likes, 0);
};

const favoriteBlog = (blogs) => {
  return blogs.reduce(
    (max, blog) => (max && max.likes > blog.likes ? max : blog),
    null
  );
};

const mostBlogs = (blogs) => {
  const authors = blogs.reduce((authors, blog) => {
    const author = authors.find((author) => author.author === blog.author);
    if (author) {
      author.blogs += 1;
    } else {
      authors.push({ author: blog.author, blogs: 1 });
    }
    return authors;
  }, []);

  return authors.reduce(
    (max, author) => (max && max.blogs > author.blogs ? max : author),
    null
  );
};

const mostLikes = (blogs) => {
  const authors = blogs.reduce((authors, blog) => {
    const author = authors.find((author) => author.author === blog.author);
    if (author) {
      author.likes += blog.likes;
    } else {
      authors.push({ author: blog.author, likes: blog.likes });
    }
    return authors;
  }, []);

  return authors.reduce(
    (max, author) => (max && max.likes > author.likes ? max : author),
    null
  );
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
};
