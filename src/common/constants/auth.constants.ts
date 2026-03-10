export default () => ({
  secret: process.env.JWT_SECRET,
  expireIn: process.env.JWT_EXPIRES_IN,
});
