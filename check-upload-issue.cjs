const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkUploadIssue() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Get the uploaded document
    const doc = await collection.findOne({ year: 2026, month: 11 });
    
    if (!doc) {
      console.log("❌ No document found");
      return;
    }
    
    console.log(`📄 Document info:`);
    console.log(`  Rows field: ${doc.rows}`);
    console.log(`  Columns field: ${doc.columns}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Uploaded at: ${doc.uploadedAt}`);
    
    if (doc.data && Array.isArray(doc.data)) {
      const actualRows = doc.data.length - 1; // Minus header row
      console.log(`  Actual data rows: ${actualRows}`);
      console.log(`  Header row: ${doc.data[0] ? 'Present' : 'Missing'}`);
      
      if (doc.rows !== actualRows) {
        console.log(`⚠️ MISMATCH: Rows field (${doc.rows}) != Actual rows (${actualRows})`);
      } else {
        console.log(`✅ Row count matches`);
      }
      
      // Check for empty rows
      let emptyRows = 0;
      let validRows = 0;
      
      for (let i = 1; i < doc.data.length; i++) {
        const row = doc.data[i];
        if (!row || !Array.isArray(row) || row.every(cell => !cell || cell.toString().trim() === '')) {
          emptyRows++;
        } else {
          validRows++;
        }
      }
      
      console.log(`  Valid rows: ${validRows}`);
      console.log(`  Empty rows: ${emptyRows}`);
      
      // Check if data was truncated
      if (actualRows === 9999) {
        console.log(`⚠️ Data might be truncated at 9999 rows (common limit)`);
      }
      
      // Sample first and last few rows
      console.log(`\n📋 First row data:`, doc.data[1] ? doc.data[1].slice(0, 5) : 'Missing');
      console.log(`📋 Last row data:`, doc.data[doc.data.length - 1] ? doc.data[doc.data.length - 1].slice(0, 5) : 'Missing');
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

checkUploadIssue();