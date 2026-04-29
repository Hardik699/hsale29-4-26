const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function clearPetpoojaData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Check current count
    const count = await collection.countDocuments();
    console.log(`📊 Current petpooja documents: ${count}`);
    
    if (count === 0) {
      console.log("✅ Collection is already empty");
      return;
    }
    
    // Delete all documents
    console.log("🗑️ Clearing all petpooja data...");
    const result = await collection.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} documents`);
    console.log("🧹 Petpooja collection cleared successfully!");
    
    // Verify deletion
    const newCount = await collection.countDocuments();
    console.log(`📊 Remaining documents: ${newCount}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("🔌 Connection closed");
  }
}

clearPetpoojaData();