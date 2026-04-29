const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function fixMarchUpload() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Get the wrongly uploaded document (November 2026)
    const wrongDoc = await collection.findOne({ year: 2026, month: 11 });
    
    if (!wrongDoc) {
      console.log("❌ No November 2026 document found");
      return;
    }
    
    console.log(`📄 Found document: ${wrongDoc.rows} rows`);
    
    // Check if data actually contains March dates
    if (wrongDoc.data && Array.isArray(wrongDoc.data)) {
      const headers = wrongDoc.data[0];
      const dateIdx = headers.findIndex(h => h && h.toLowerCase().includes("new date"));
      
      let marchCount = 0;
      let nonMarchCount = 0;
      
      wrongDoc.data.slice(1).forEach(row => {
        if (row && row[dateIdx]) {
          const dateStr = row[dateIdx].toString();
          if (dateStr.includes("/03/2026") || dateStr.includes("2026-03")) {
            marchCount++;
          } else {
            nonMarchCount++;
          }
        }
      });
      
      console.log(`📊 March 2026 rows: ${marchCount}`);
      console.log(`📊 Non-March rows: ${nonMarchCount}`);
      
      if (marchCount > nonMarchCount) {
        console.log("🔄 This data should be March 2026, fixing...");
        
        // Update the document to correct month
        const result = await collection.updateOne(
          { _id: wrongDoc._id },
          { 
            $set: { 
              month: 3,  // Change to March
              uploadedAt: new Date()
            } 
          }
        );
        
        console.log(`✅ Updated document: ${result.modifiedCount} modified`);
        console.log("✅ Data is now correctly labeled as March 2026");
      } else {
        console.log("⚠️ Data seems mixed, manual review needed");
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("🔌 Connection closed");
  }
}

fixMarchUpload();