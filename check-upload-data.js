import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkUploadData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Get all documents
    const docs = await collection.find({}).toArray();
    console.log(`📦 Found ${docs.length} petpooja documents`);
    
    docs.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`  Year: ${doc.year}`);
      console.log(`  Month: ${doc.month}`);
      console.log(`  Rows: ${doc.rows}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  Uploaded: ${doc.uploadedAt}`);
      
      if (doc.data && Array.isArray(doc.data)) {
        // Check date range in data
        const headers = doc.data[0];
        const dateIdx = headers.findIndex(h => h && h.toLowerCase().includes("new date"));
        
        if (dateIdx !== -1) {
          const dates = new Set();
          doc.data.slice(1, 100).forEach(row => { // Check first 100 rows
            if (row && row[dateIdx]) {
              const dateStr = row[dateIdx].toString();
              // Extract month/year from date
              if (dateStr.includes("/")) {
                const parts = dateStr.split("/");
                if (parts.length >= 3) {
                  dates.add(`${parts[1]}/${parts[2]}`); // MM/YYYY
                }
              }
            }
          });
          
          console.log(`  Date range in data: ${Array.from(dates).slice(0, 5).join(", ")}`);
          console.log(`  Unique months: ${dates.size}`);
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

checkUploadData();