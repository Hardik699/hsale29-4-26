import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkSupplyNote() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const supplyNotesCollection = db.collection("supply_notes");
    
    console.log("\n🔍 Searching for Mohan Theka data...\n");
    
    // Search for Mohan Theka in deliveryLocation field
    const mohanThekaRecords = await supplyNotesCollection.find({
      deliveryLocation: { $regex: /mohan.*theka/i }
    }).toArray();
    
    if (mohanThekaRecords.length > 0) {
      console.log(`✅ Found ${mohanThekaRecords.length} records for Mohan Theka\n`);
      
      // Group by skuCode and calculate totals
      const skuSummary = {};
      
      mohanThekaRecords.forEach(record => {
        const sku = record.skuCode || "Unknown";
        const qty = record.receivedQty || 0;
        
        if (!skuSummary[sku]) {
          skuSummary[sku] = {
            totalQty: 0,
            count: 0,
            records: []
          };
        }
        
        skuSummary[sku].totalQty += qty;
        skuSummary[sku].count += 1;
        skuSummary[sku].records.push(record);
      });
      
      console.log("📊 Summary by SKU Code:\n");
      console.log("=".repeat(70));
      
      Object.keys(skuSummary).sort().forEach(sku => {
        const data = skuSummary[sku];
        console.log(`\n${sku}:`);
        console.log(`  Total Quantity: ${data.totalQty.toFixed(2)}`);
        console.log(`  Number of Records: ${data.count}`);
      });
      
      console.log("\n" + "=".repeat(70));
      
      // Show detailed records (first 20)
      console.log("\n📋 Detailed Records (first 20):\n");
      mohanThekaRecords.slice(0, 20).forEach((record, index) => {
        console.log(`${index + 1}. SKU: ${record.skuCode || "N/A"}`);
        console.log(`   Indent No: ${record.indentNo || "N/A"}`);
        console.log(`   Location: ${record.deliveryLocation || "N/A"}`);
        console.log(`   Invoice Date: ${record.invoiceDateRaw || "N/A"}`);
        console.log(`   Received Qty: ${record.receivedQty || 0}`);
        console.log("");
      });
      
      if (mohanThekaRecords.length > 20) {
        console.log(`... and ${mohanThekaRecords.length - 20} more records\n`);
      }
      
      // Calculate grand total
      const grandTotal = mohanThekaRecords.reduce((sum, r) => sum + (r.receivedQty || 0), 0);
      console.log("=".repeat(70));
      console.log(`📦 GRAND TOTAL QUANTITY: ${grandTotal.toFixed(2)}`);
      console.log("=".repeat(70));
      
    } else {
      console.log("❌ No records found for Mohan Theka\n");
      
      // Show available delivery locations
      const locations = await supplyNotesCollection.distinct("deliveryLocation");
      console.log(`\nTotal unique delivery locations: ${locations.length}`);
      console.log("\nAvailable delivery locations (first 20):");
      locations.slice(0, 20).forEach(loc => console.log(`  - ${loc}`));
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

checkSupplyNote();
