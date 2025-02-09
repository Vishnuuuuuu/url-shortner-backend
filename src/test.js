
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://Vishnu:y8MPvLxIYMc1vS73@cluster0.9b6yh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"


// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);


const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function debugUserIdQuery() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully");

    const db = client.db('url_shortener');
    const userId = "102253486702087162941";  // Test the userId directly

    // Find URLs under this userId
    const urls = await db.collection('urls').find({ userId }).toArray();

    if (urls.length === 0) {
      console.log("No URLs found for userId:", userId);
    } else {
      console.log("Found URLs for userId:", userId);
      console.log(JSON.stringify(urls, null, 2));  // Print the URLs in a readable format
    }
  } catch (err) {
    console.error("Error fetching URLs for userId:", err);
  } finally {
    await client.close();
  }
}

// Run the test
debugUserIdQuery();
