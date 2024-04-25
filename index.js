const express = require('express'); 
const app = express();
app.use(express.json());
const axios = require('axios');
require('dotenv').config();
const { createClient } = require("redis");

const initializeRedisClient = async function() {
  let redisURL = process.env.REDIS_URI;
  if (redisURL) {
    redisClient = createClient({ url: redisURL }).on("error", (e) => {
      console.error(`Failed to create the Redis client with error:`);
      console.error(e);
    });

    try {
      await redisClient.connect();
      console.log(`Connected to Redis successfully!`);
    } catch (e) {
      console.error(`Connection to Redis failed with error:`);
      console.error(e);
    }
  }
}

const cache = {
  get: async (key) => {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null; 
  },
  set: async (key, value, expiry = 60) => { 
    await redisClient.set(key, JSON.stringify(value), 'EX', expiry);  
  },
  del: async (key) => {
    await redisClient.del(key);
  }
};

const initializeExpressServer = async function() {
  await initializeRedisClient();

  app.get(
    "/posts",
    async (req, res) => {
      try {
        let data = await cache.get('posts');
        if (!data) {
          const response = await axios.get(
            "https://jsonplaceholder.typicode.com/posts"
          );
          data = response.data;
          await cache.set('posts', data);
        }
        res.send(data);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Error fetching data from API" });
      }
    }
  );

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}


initializeExpressServer()
  .then()
  .catch((e) => console.error(e));