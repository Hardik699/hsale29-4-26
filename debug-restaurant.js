import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkRestaurantData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Get all petpooja data
    const docs = await collection.find({}).toArray();
    console.log(`📦 Found ${docs.length} petpooja documents`);
    
    let totalCCOQty = 0;
    let totalMKPQty = 0;
    let totalAllQty = 0;
    let ccoRecords = 0;
    let mkpRecords = 0;
    
    for (const doc of docs) {
      if (!doc.data || doc.data.length < 2) continue;
      
      const headers = doc.data[0];
      const dataRows = doc.data.slice(1);
      
      // Find column indices
      const restaurantIdx = headers.findIndex(h => h && h.toLowerCase().includes("restaurant"));
      const dateIdx = headers.findIndex(h => h && h.toLowerCase().includes("new date"));
      const itemNameIdx = headers.findIndex(h => h && h.toLowerCase().includes("item_name"));
      const qtyIdx = headers.findIndex(h => h && h.toLowerCase().includes("item_quantity"));
      
      if (restaurantIdx === -1 || dateIdx === -1 || itemNameIdx === -1 || qtyIdx === -1) continue;
      
      for (const row of dataRows) {
        if (!row || !Array.isArray(row)) continue;
        
        const restaurant = row[restaurantIdx]?.toString().trim() || "";
        const dateStr = row[dateIdx]?.toString().trim() || "";
        const itemName = row[itemNameIdx]?.toString().trim() || "";
        const qty = parseFloat(row[qtyIdx]?.toString() || "0") || 0;
        
        // Check if it's Mohan Thal and Jan 2026
        if (!itemName.toLowerCase().includes("mohan")) continue;
        
        // Check date format - could be "20/01/2026" or "2026-01-20"
        const isJan2026 = dateStr.includes("2026-01") || 
                         dateStr.includes("01/2026") || 
                         (dateStr.includes("/01/2026")) ||
                         (dateStr.includes("2026") && dateStr.includes("01"));
        
        if (!isJan2026) continue;
        
        // Only log first 5 records
        if (totalAllQty < 5) {
          console.log(`📅 Date: ${dateStr}, Restaurant: ${restaurant}, Item: ${itemName}, Qty: ${qty}`);
        }
        
        totalAllQty += qty;
        
        if (restaurant === "HanuRam CCO") {
          totalCCOQty += qty;
          ccoRecords++;
        } else if (restaurant === "HanuRam MKP") {
          totalMKPQty += qty;
          mkpRecords++;
        }
      }
    }
    
    console.log("\n📊 Mohan Thal Jan 2026 Results:");
    console.log(`🏪 HanuRam CCO: ${totalCCOQty.toFixed(2)} kg (${ccoRecords} records)`);
    console.log(`🏪 HanuRam MKP: ${totalMKPQty.toFixed(2)} kg (${mkpRecords} records)`);
    console.log(`🏪 Total All: ${totalAllQty.toFixed(2)} kg`);
    console.log(`🏪 CCO + MKP: ${(totalCCOQty + totalMKPQty).toFixed(2)} kg`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

checkRestaurantData();