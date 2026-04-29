const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkMarchData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Check all documents
    const docs = await collection.find({}).toArray();
    console.log(`📦 Total petpooja documents: ${docs.length}`);
    
    // Group by year/month
    const monthData = {};
    
    docs.forEach(doc => {
      const key = `${doc.year}-${doc.month}`;
      if (!monthData[key]) {
        monthData[key] = { count: 0, totalRows: 0 };
      }
      monthData[key].count++;
      monthData[key].totalRows += doc.rows || 0;
    });
    
    console.log("\n📊 Data by Month:");
    Object.keys(monthData).sort().forEach(key => {
      const data = monthData[key];
      console.log(`  ${key}: ${data.count} documents, ${data.totalRows} rows`);
    });
    
    // Check if March 2026 exists
    const march2026 = monthData['2026-3'];
    if (march2026) {
      console.log(`\n✅ March 2026 data found: ${march2026.count} documents, ${march2026.totalRows} rows`);
    } else {
      console.log("\n❌ March 2026 data NOT found");
    }
    
    // Check actual data content for March
    if (docs.length > 0) {
      const sampleDoc = docs[0];
      if (sampleDoc.data && Array.isArray(sampleDoc.data)) {
        const headers = sampleDoc.data[0];
        const dateIdx = headers.findIndex(h => h && h.toLowerCase().includes("new date"));
        
        if (dateIdx !== -1) {
          const marchDates = new Set();
          sampleDoc.data.slice(1, 1000).forEach(row => {
            if (row && row[dateIdx]) {
              const dateStr = row[dateIdx].toString();
              if (dateStr.includes("/03/2026") || dateStr.includes("2026-03")) {
                marchDates.add(dateStr);
              }
            }
          });
          
          if (marchDates.size > 0) {
            console.log(`\n📅 Found March 2026 dates in data: ${marchDates.size} unique dates`);
            console.log("Sample dates:", Array.from(marchDates).slice(0, 5));
          } else {
            console.log("\n📅 No March 2026 dates found in sample data");
          }
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

checkMarchData();