import { MongoClient, ServerApiVersion, Db } from "mongodb";

// Add a type declaration for globalThis.client
declare global {
  var client: MongoClient | undefined;
}

// Replace the placeholder with your Atlas connection string
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

// export default client;
export default db;

// async function run() {
//   try {
//     // Connect the client to the server (optional starting in v4.7)
//     await client.connect();

//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!"
//     );
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);
