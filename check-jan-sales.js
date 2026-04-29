import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://admin:admin1@cluster0.a3duo.mongodb.net/?appName=Cluster0";

async function checkJanSales() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("upload_system");
    const collection = db.collection("petpooja");
    
    // Get count first
    const count = await collection.countDocuments();
    console.log(`📦 Total petpooja documents: ${count}`);
    
    // Get one sample document
    const sample = await collection.findOne({});
    if (!sample) {
      console.log("❌ No documents found");
      return;
    }
    
    console.log("📄 Sample document keys:", Object.keys(sample));
    if (sample.data && Array.isArray(sample.data)) {
      console.log("📋 Headers:", sample.data[0]);
      console.log("📊 Total rows in sample:", sample.data.length);
      
      // Check for Mohan Thal in Jan 2026
      let mohanCount = 0;
      let ccoCount = 0;
      let mkpCount = 0;
      
      const headers = sample.data[0];
      const restaurantIdx = 0; // restaurant_name is first column
      const dateIdx = 3; // New Date is 4th column  
      const itemIdx = 28; // item_name
      const qtyIdx = 32; // item_quantity
      
      for (let i = 1; i < sample.data.length; i++) {
        const row = sample.data[i];
        if (!row) continue;
        
        const restaurant = row[restaurantIdx] || "";
        const date = row[dateIdx] || "";
        const item = row[itemIdx] || "";
        const qty = parseFloat(row[qtyIdx] || "0");
        
        if (item.toLowerCase().includes("mohan")) {
          mohanCount++;
          
          // Check if Jan 2026 - date format is "20/01/2026"
          if (date.includes("/01/2026")) {
            if (restaurant === "HanuRam CCO") ccoCount++;
            if (restaurant === "HanuRam MKP") mkpCount++;
            
            if (mohanCount <= 5) {
              console.log(`📅 ${date} | ${restaurant} | ${item} | ${qty} kg`);
            }
          }
        }
      }
      
      console.log(`\n📊 Mohan Thal Jan 2026:`);
      console.log(`🏪 CCO: ${ccoCount} records`);
      console.log(`🏪 MKP: ${mkpCount} records`);
      console.log(`🏪 Total: ${ccoCount + mkpCount} records`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

checkJanSales();