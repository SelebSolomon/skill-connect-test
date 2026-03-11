export default () => ({
  mongodb: {
    uri:
      process.env.NODE_ENV === 'production'
        ? process.env.MONGO_URL_ATLAS
        : process.env.MONGO_URL,
  },
});
