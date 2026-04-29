const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function clearSupplyNoteData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("supply_notes");
    
    // Check current count
    const count = await collection.countDocuments();
    console.log(`📊 Current supply_notes documents: ${count}`);
    
    if (count === 0) {
      console.log("✅ Collection is already empty");
      return;
    }
    
    // Delete all documents
    console.log("🗑️ Clearing all supply note data...");
    const result = await collection.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} documents`);
    console.log("🧹 Supply notes collection cleared successfully!");
    
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

clearSupplyNoteData();
