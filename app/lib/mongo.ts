import { MongoClient, ServerApiVersion, Db } from "mongodb";

declare global {
  var client: MongoClient | undefined;
}

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/";

let client: MongoClient;
let db: Db;

if (process.env.NODE_ENV === "production") {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  db = client.db();
} else {
  if (!globalThis.client) {
    globalThis.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  client = globalThis.client;
  db = client.db();
}

export default db;


