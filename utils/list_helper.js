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

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog
};
