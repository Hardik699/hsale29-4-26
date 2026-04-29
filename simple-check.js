const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function simpleCheck() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("Connected");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    const docs = await collection.find({}, { projection: { year: 1, month: 1, rows: 1, status: 1 } }).toArray();
    
    console.log("Petpooja documents:");
    docs.forEach(doc => {
      console.log(`- Year: ${doc.year}, Month: ${doc.month}, Rows: ${doc.rows}, Status: ${doc.status}`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

simpleCheck();