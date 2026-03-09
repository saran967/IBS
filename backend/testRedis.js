import IORedis from "ioredis";

const redis = new IORedis(process.env.REDIS_URL);

redis.set("test", "hello");

redis.get("test").then((value) => {
  console.log("Redis Working: ", value);
});
