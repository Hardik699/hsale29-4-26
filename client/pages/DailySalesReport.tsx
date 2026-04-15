import { useState, useEffect } from "react";
import { ArrowLeft, Download, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DailySalesReport() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 6 months ago
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("monthly"); // Default to monthly for 6 months data
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showItemSelection, setShowItemSelection] = useState(false);

  // Fetch categories from items
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/items");
        if (response.ok) {
          const items = await response.json();
          const uniqueCategories = Array.from(new Set(items.map((item: any) => item.category).filter(Boolean))) as string[];
          setCategories(uniqueCategories.sort());
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch items when category changes
  useEffect(() => {
    const fetchItems = async () => {
      if (selectedCategory === "all") {
        setAvailableItems([]);
        setSelectedItems([]);
        setShowItemSelection(false);
        return;
      }

      try {
        const response = await fetch("/api/items");
        if (response.ok) {
          const items = await response.json();
          const categoryItems = items.filter((item: any) => item.category === selectedCategory);
          setAvailableItems(categoryItems);
          setSelectedItems([]); // Reset selection when category changes
          setShowItemSelection(categoryItems.length > 0);
        }
      } catch (error) {
        console.error("Failed to fetch items:", error);
        setAvailableItems([]);
        setSelectedItems([]);
        setShowItemSelection(false);
      }
    };

    fetchItems();
  }, [selectedCategory]);

  const downloadWeeklySalesReport = async () => {
    try {
      setLoading(true);
      const XLSX = await import("xlsx");

      // Determine which items to process
      let itemsToProcess: any[] = [];
      
      if (selectedCategory === "all") {
        // Get all items
        const itemsResponse = await fetch("/api/items");
        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch items");
        }
        itemsToProcess = await itemsResponse.json();
      } else if (selectedItems.length > 0) {
        // Use selected items only
        itemsToProcess = availableItems.filter((item: any) => 
          selectedItems.includes(item.itemId)
        );
      } else {
        // Use all items in category (fallback)
        itemsToProcess = availableItems;
      }

      console.log(`📊 Client: Processing ${itemsToProcess.length} items for weekly report`);

      if (itemsToProcess.length === 0) {
        alert("No items selected for download");
        setLoading(false);
        return;
      }

      // Now fetch sales data for each item individually using the working API
      const allSalesData: any[] = [];
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        console.log(`📊 Fetching data for item ${i + 1}/${itemsToProcess.length}: ${item.itemName}`);
        
        try {
          const salesResponse = await fetch(
            `/api/sales/item/${item.itemId}?startDate=${dateRange.start}&endDate=${dateRange.end}`
          );
          
          if (salesResponse.ok) {
            const salesData = await salesResponse.json();
            
            if (salesData.success && salesData.data && salesData.data.dateWiseData) {
              // Convert individual item data to report format
              salesData.data.dateWiseData.forEach((dayData: any) => {
                allSalesData.push({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  category: item.category,
                  group: item.group || "Sweet",
                  date: dayData.date,
                  zomatoQty: dayData.zomatoQty || 0,
                  swiggyQty: dayData.swiggyQty || 0,
                  diningQty: dayData.diningQty || 0,
                  parcelQty: dayData.parcelQty || 0,
                });
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for ${item.itemName}:`, error);
        }
      }

      console.log(`📊 Client: Collected ${allSalesData.length} total records from individual APIs`);

      if (allSalesData.length === 0) {
        alert("No sales data found for selected items and date range");
        setLoading(false);
        return;
      }

      // Group data by item first
      const itemMap: any = {};
      allSalesData.forEach((sale: any) => {
        const itemKey = `${sale.itemName}_${sale.category}`;
        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            itemName: sale.itemName,
            category: sale.category,
            group: sale.group || "N/A",
            dates: {},
          };
        }

        const dateKey = sale.date;
        if (!itemMap[itemKey].dates[dateKey]) {
          itemMap[itemKey].dates[dateKey] = { online: 0, offline: 0 };
        }

        const online = (sale.zomatoQty || 0) + (sale.swiggyQty || 0);
        const offline = (sale.diningQty || 0) + (sale.parcelQty || 0);

        itemMap[itemKey].dates[dateKey].online += online;
        itemMap[itemKey].dates[dateKey].offline += offline;
      });

      console.log(`📊 Client: Grouped into ${Object.keys(itemMap).length} unique items`);

      // Generate weekly ranges
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const weeklyRanges: Array<{ start: Date; end: Date; label: string }> = [];
      let currentWeekStart = new Date(startDate);
      
      while (currentWeekStart <= endDate) {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
        
        if (currentWeekEnd > endDate) {
          currentWeekEnd.setTime(endDate.getTime());
        }
        
        const startLabel = currentWeekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
        const endLabel = currentWeekEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
        
        weeklyRanges.push({
          start: new Date(currentWeekStart),
          end: new Date(currentWeekEnd),
          label: `${startLabel} To ${endLabel}`
        });
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      // Create header rows
      const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
      const headerRow2: any[] = ["", "", "", ""];

      weeklyRanges.forEach((week) => {
        headerRow1.push(week.label, "");
        headerRow2.push("Online", "Offline");
      });

      headerRow1.push("Total", "", "Unit");
      headerRow2.push("Online", "Offline", "");

      // Create data rows
      const dataRows: any[] = [];
      Object.values(itemMap).forEach((item: any) => {
        const row: any[] = ["HanuRam CCO", item.group, item.itemName, item.category];

        let totalOnline = 0;
        let totalOffline = 0;

        weeklyRanges.forEach((week) => {
          let weekOnline = 0;
          let weekOffline = 0;

          Object.entries(item.dates).forEach(([dateStr, data]: [string, any]) => {
            const date = new Date(dateStr);
            if (date >= week.start && date <= week.end) {
              weekOnline += data.online;
              weekOffline += data.offline;
            }
          });

          // Format numbers to 2 decimal places
          row.push(
            weekOnline > 0 ? parseFloat(weekOnline.toFixed(2)) : 0,
            weekOffline > 0 ? parseFloat(weekOffline.toFixed(2)) : 0
          );
          totalOnline += weekOnline;
          totalOffline += weekOffline;
        });

        // Add totals with proper formatting
        row.push(
          totalOnline > 0 ? parseFloat(totalOnline.toFixed(2)) : 0,
          totalOffline > 0 ? parseFloat(totalOffline.toFixed(2)) : 0,
          "KG"
        );
        dataRows.push(row);
      });

      dataRows.sort((a, b) => {
        if (a[3] !== b[3]) return a[3].localeCompare(b[3]);
        return a[2].localeCompare(b[2]);
      });

      // Create and style worksheet
      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

      // Merge cells
      const merges: any[] = [];
      let colIndex = 4;
      weeklyRanges.forEach(() => {
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });
      merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
      ws["!merges"] = merges;

      // Column widths
      const colWidths = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 18 }];
      weeklyRanges.forEach(() => {
        colWidths.push({ wch: 12 }, { wch: 12 });
      });
      colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 8 });
      ws["!cols"] = colWidths;

      // Apply styling
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          ws[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };

          if (R === 0) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "4472C4" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 12 };
          } else if (R === 1) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "8FAADC" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 };
          } else {
            ws[cellAddress].s.fill = { fgColor: { rgb: "FFFFFF" } };
            ws[cellAddress].s.font = { sz: 11 };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Weekly Sales");

      const categoryLabel = selectedCategory === "all" ? "All_Categories" : selectedCategory.replace(/\s+/g, "_");
      XLSX.writeFile(wb, `Weekly_Sales_Report_${categoryLabel}_${dateRange.start}_to_${dateRange.end}.xlsx`, {
        bookType: "xlsx",
        cellStyles: true,
      });

      setLoading(false);
    } catch (error) {
      console.error("Weekly download failed:", error);
      alert("Failed to download weekly report. Please try again.");
      setLoading(false);
    }
  };

  const downloadMonthlySalesReport = async () => {
    try {
      setLoading(true);
      const XLSX = await import("xlsx");

      // Determine which items to process
      let itemsToProcess: any[] = [];
      
      if (selectedCategory === "all") {
        // Get all items
        const itemsResponse = await fetch("/api/items");
        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch items");
        }
        itemsToProcess = await itemsResponse.json();
      } else if (selectedItems.length > 0) {
        // Use selected items only
        itemsToProcess = availableItems.filter((item: any) => 
          selectedItems.includes(item.itemId)
        );
      } else {
        // Use all items in category (fallback)
        itemsToProcess = availableItems;
      }

      console.log(`📊 Client: Processing ${itemsToProcess.length} items for monthly report`);

      if (itemsToProcess.length === 0) {
        alert("No items selected for download");
        setLoading(false);
        return;
      }

      // Now fetch sales data for each item individually using the working API
      const allSalesData: any[] = [];
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        console.log(`📊 Fetching data for item ${i + 1}/${itemsToProcess.length}: ${item.itemName}`);
        
        try {
          const salesResponse = await fetch(
            `/api/sales/item/${item.itemId}?startDate=${dateRange.start}&endDate=${dateRange.end}`
          );
          
          if (salesResponse.ok) {
            const salesData = await salesResponse.json();
            
            if (salesData.success && salesData.data && salesData.data.dateWiseData) {
              // Convert individual item data to report format
              salesData.data.dateWiseData.forEach((dayData: any) => {
                allSalesData.push({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  category: item.category,
                  group: item.group || "Sweet",
                  date: dayData.date,
                  zomatoQty: dayData.zomatoQty || 0,
                  swiggyQty: dayData.swiggyQty || 0,
                  diningQty: dayData.diningQty || 0,
                  parcelQty: dayData.parcelQty || 0,
                });
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for ${item.itemName}:`, error);
        }
      }

      console.log(`📊 Client: Collected ${allSalesData.length} total records from individual APIs`);

      if (allSalesData.length === 0) {
        alert("No sales data found for selected items and date range");
        setLoading(false);
        return;
      }

      // Group data by item and month
      const itemMap: any = {};
      allSalesData.forEach((sale: any) => {
        const itemKey = `${sale.itemName}_${sale.category}`;
        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            itemName: sale.itemName,
            category: sale.category,
            group: sale.group || "N/A",
            months: {},
          };
        }

        const date = new Date(sale.date);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "-"); // Jan-26, Feb-27, etc.
        
        if (!itemMap[itemKey].months[monthKey]) {
          itemMap[itemKey].months[monthKey] = { online: 0, offline: 0 };
        }

        const online = (sale.zomatoQty || 0) + (sale.swiggyQty || 0);
        const offline = (sale.diningQty || 0) + (sale.parcelQty || 0);

        itemMap[itemKey].months[monthKey].online += online;
        itemMap[itemKey].months[monthKey].offline += offline;
      });

      // Get all unique months in chronological order with year
      const allMonths = Array.from(new Set(
        allSalesData.map((sale: any) => {
          const date = new Date(sale.date);
          return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "-");
        })
      )).sort((a, b) => {
        // Sort by year first, then by month
        const [monthA, yearA] = a.split("-");
        const [monthB, yearB] = b.split("-");
        
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
      });

      // Create header rows
      const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
      const headerRow2: any[] = ["", "", "", ""];

      allMonths.forEach((month) => {
        headerRow1.push(month, "");
        headerRow2.push("Online", "Offline");
      });

      headerRow1.push("Total", "", "Unit");
      headerRow2.push("Online", "Offline", "");

      // Create data rows
      const dataRows: any[] = [];
      Object.values(itemMap).forEach((item: any) => {
        const row: any[] = ["HanuRam CCO", item.group, item.itemName, item.category];

        let totalOnline = 0;
        let totalOffline = 0;

        allMonths.forEach((month) => {
          const online = item.months[month]?.online || 0;
          const offline = item.months[month]?.offline || 0;
          // Format numbers to 2 decimal places
          row.push(
            online > 0 ? parseFloat(online.toFixed(2)) : 0,
            offline > 0 ? parseFloat(offline.toFixed(2)) : 0
          );
          totalOnline += online;
          totalOffline += offline;
        });

        // Add totals with proper formatting
        row.push(
          totalOnline > 0 ? parseFloat(totalOnline.toFixed(2)) : 0,
          totalOffline > 0 ? parseFloat(totalOffline.toFixed(2)) : 0,
          "KG"
        );
        dataRows.push(row);
      });

      dataRows.sort((a, b) => {
        if (a[3] !== b[3]) return a[3].localeCompare(b[3]);
        return a[2].localeCompare(b[2]);
      });

      // Create and style worksheet
      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

      // Merge cells
      const merges: any[] = [];
      let colIndex = 4;
      allMonths.forEach(() => {
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        colIndex += 2;
      });
      merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
      ws["!merges"] = merges;

      // Column widths
      const colWidths = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 18 }];
      allMonths.forEach(() => {
        colWidths.push({ wch: 10 }, { wch: 10 });
      });
      colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 8 });
      ws["!cols"] = colWidths;

      // Apply styling
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          ws[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };

          if (R === 0) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "4472C4" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 12 };
          } else if (R === 1) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "8FAADC" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 };
          } else {
            ws[cellAddress].s.fill = { fgColor: { rgb: "FFFFFF" } };
            ws[cellAddress].s.font = { sz: 11 };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Sales");

      const categoryLabel = selectedCategory === "all" ? "All_Categories" : selectedCategory.replace(/\s+/g, "_");
      XLSX.writeFile(wb, `Monthly_Sales_Report_${categoryLabel}_${dateRange.start}_to_${dateRange.end}.xlsx`, {
        bookType: "xlsx",
        cellStyles: true,
      });

      setLoading(false);
    } catch (error) {
      console.error("Monthly download failed:", error);
      alert("Failed to download monthly report. Please try again.");
      setLoading(false);
    }
  };

  const downloadDailySalesReport = async () => {
    try {
      setLoading(true);
      const XLSX = await import("xlsx");

      // Determine which items to process
      let itemsToProcess: any[] = [];
      
      if (selectedCategory === "all") {
        // Get all items
        const itemsResponse = await fetch("/api/items");
        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch items");
        }
        itemsToProcess = await itemsResponse.json();
      } else if (selectedItems.length > 0) {
        // Use selected items only
        itemsToProcess = availableItems.filter((item: any) => 
          selectedItems.includes(item.itemId)
        );
      } else {
        // Use all items in category (fallback)
        itemsToProcess = availableItems;
      }

      console.log(`📊 Client: Processing ${itemsToProcess.length} items for category: ${selectedCategory}`);

      if (itemsToProcess.length === 0) {
        alert("No items selected for download");
        setLoading(false);
        return;
      }

      // Now fetch sales data for each item individually using the working API
      const allSalesData: any[] = [];
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        console.log(`📊 Fetching data for item ${i + 1}/${itemsToProcess.length}: ${item.itemName}`);
        
        try {
          const salesResponse = await fetch(
            `/api/sales/item/${item.itemId}?startDate=${dateRange.start}&endDate=${dateRange.end}`
          );
          
          if (salesResponse.ok) {
            const salesData = await salesResponse.json();
            
            if (salesData.success && salesData.data && salesData.data.dateWiseData) {
              // Convert individual item data to report format
              salesData.data.dateWiseData.forEach((dayData: any) => {
                allSalesData.push({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  category: item.category,
                  group: item.group || "Sweet",
                  date: dayData.date,
                  zomatoQty: dayData.zomatoQty || 0,
                  swiggyQty: dayData.swiggyQty || 0,
                  diningQty: dayData.diningQty || 0,
                  parcelQty: dayData.parcelQty || 0,
                });
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for ${item.itemName}:`, error);
        }
      }

      console.log(`📊 Client: Collected ${allSalesData.length} total records from individual APIs`);

      if (allSalesData.length === 0) {
        alert("No sales data found for selected items and date range");
        setLoading(false);
        return;
      }

      // Debug: Log sample data to check KG conversion
      console.log("🔍 Sample sales data (first 3 records):");
      allSalesData.slice(0, 3).forEach((record, idx) => {
        console.log(`  Record ${idx + 1}:`, {
          item: record.itemName,
          date: record.date,
          zomato: record.zomatoQty,
          swiggy: record.swiggyQty,
          dining: record.diningQty,
          parcel: record.parcelQty,
          total: (record.zomatoQty || 0) + (record.swiggyQty || 0) + (record.diningQty || 0) + (record.parcelQty || 0)
        });
      });

      // Group data by item (same as before)
      const itemMap: any = {};
      allSalesData.forEach((sale: any) => {
        const itemKey = `${sale.itemName}_${sale.category}`;
        if (!itemMap[itemKey]) {
          itemMap[itemKey] = {
            itemName: sale.itemName,
            category: sale.category,
            group: sale.group || "N/A",
            dates: {},
          };
        }

        const dateKey = sale.date;
        if (!itemMap[itemKey].dates[dateKey]) {
          itemMap[itemKey].dates[dateKey] = { online: 0, offline: 0 };
        }

        const online = (sale.zomatoQty || 0) + (sale.swiggyQty || 0);
        const offline = (sale.diningQty || 0) + (sale.parcelQty || 0);

        itemMap[itemKey].dates[dateKey].online += online;
        itemMap[itemKey].dates[dateKey].offline += offline;
      });

      console.log(`📊 Client: Grouped into ${Object.keys(itemMap).length} unique items`);

      // Debug: Log sample grouped data
      const firstItem = Object.values(itemMap)[0] as any;
      if (firstItem) {
        console.log("🔍 Sample grouped item data:", {
          item: firstItem.itemName,
          category: firstItem.category,
          sampleDates: Object.keys(firstItem.dates).slice(0, 3),
          sampleData: Object.entries(firstItem.dates).slice(0, 3).map(([date, data]: [string, any]) => ({
            date,
            online: data.online,
            offline: data.offline,
            total: data.online + data.offline
          }))
        });
      }

      // Rest of the Excel generation logic remains the same...
      const allDates = Array.from(
        new Set(allSalesData.map((sale: any) => sale.date))
      ).sort();

      // Create header rows - matching exact image format
      const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
      const headerRow2: any[] = ["", "", "", ""];

      // Add date headers with Online/Offline sub-columns
      allDates.forEach((date: string) => {
        const formatted = new Date(date).toLocaleDateString("en-GB");
        headerRow1.push(formatted, "");
        headerRow2.push("Online", "Offline");
      });

      // Add Total header with Online/Offline sub-columns
      headerRow1.push("Total", "", "Unit");
      headerRow2.push("Online", "Offline", "");

      // Create data rows - each item gets its own row
      const dataRows: any[] = [];

      Object.values(itemMap).forEach((item: any) => {
        const row: any[] = [
          "HanuRam CCO",      // restaurant_name
          item.group,         // brand_grouping
          item.itemName,      // item_name
          item.category,      // category_name
        ];

        let totalOnline = 0;
        let totalOffline = 0;

        // Add date data
        allDates.forEach((date: string) => {
          const online = item.dates[date]?.online || 0;
          const offline = item.dates[date]?.offline || 0;
          // Format numbers to 2 decimal places for better readability
          row.push(
            online > 0 ? parseFloat(online.toFixed(2)) : 0,
            offline > 0 ? parseFloat(offline.toFixed(2)) : 0
          );
          totalOnline += online;
          totalOffline += offline;
        });

        // Add totals with proper formatting
        row.push(
          totalOnline > 0 ? parseFloat(totalOnline.toFixed(2)) : 0,
          totalOffline > 0 ? parseFloat(totalOffline.toFixed(2)) : 0
        );
        row.push("KG"); // Default unit

        dataRows.push(row);
      });

      // Sort by category and item name
      dataRows.sort((a, b) => {
        if (a[3] !== b[3]) return a[3].localeCompare(b[3]); // category
        return a[2].localeCompare(b[2]); // item name
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

      // Merge cells for date headers and Total header
      const merges: any[] = [];
      let colIndex = 4; // Start after first 4 columns

      // Merge date headers
      allDates.forEach(() => {
        merges.push({
          s: { r: 0, c: colIndex },
          e: { r: 0, c: colIndex + 1 },
        });
        colIndex += 2;
      });

      // Merge Total header
      merges.push({
        s: { r: 0, c: colIndex },
        e: { r: 0, c: colIndex + 1 },
      });

      ws["!merges"] = merges;

      // Add column widths
      const colWidths = [
        { wch: 18 }, // restaurant_name
        { wch: 15 }, // brand_grouping
        { wch: 25 }, // item_name
        { wch: 18 }, // category_name
      ];

      // Add widths for date columns
      allDates.forEach(() => {
        colWidths.push({ wch: 10 }); // Online
        colWidths.push({ wch: 10 }); // Offline
      });

      colWidths.push({ wch: 10 }); // Total Online
      colWidths.push({ wch: 10 }); // Total Offline
      colWidths.push({ wch: 8 }); // Unit

      ws["!cols"] = colWidths;

      // Apply styling to all cells
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          // Initialize cell style
          ws[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };

          // Header row 1 styling (dates and Total)
          if (R === 0) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "4472C4" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 12 };
          }
          // Header row 2 styling (Online/Offline)
          else if (R === 1) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "8FAADC" } };
            ws[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 };
          }
          // Data row styling
          else {
            ws[cellAddress].s.fill = { fgColor: { rgb: "FFFFFF" } };
            ws[cellAddress].s.font = { sz: 11 };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");

      // Download with styling
      const categoryLabel = selectedCategory === "all" ? "All_Categories" : selectedCategory.replace(/\s+/g, "_");
      XLSX.writeFile(
        wb,
        `Daily_Sales_Report_${categoryLabel}_${dateRange.start}_to_${dateRange.end}.xlsx`,
        {
          bookType: "xlsx",
          cellStyles: true,
        }
      );

      setLoading(false);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download report. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/reports")}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-xl">
            <TrendingUp className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Daily Sales Breakdown</h1>
            <p className="text-gray-400 text-sm mt-1">
              Download day-wise sales report with online/offline split
            </p>
          </div>
        </div>

        {/* Report Configuration Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
          {/* Date Range */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📅 Select Date Range
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-medium">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-medium">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🏷️ Select Category
            </h2>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Item Selection */}
          {showItemSelection && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📦 Select Items ({selectedItems.length}/{availableItems.length} selected)
              </h2>
              
              {/* Select All/None Controls */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setSelectedItems(availableItems.map((item: any) => item.itemId))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedItems([])}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Select None
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                {availableItems.map((item: any) => (
                  <label
                    key={item.itemId}
                    className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.itemId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.itemId]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.itemId));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-white font-medium">{item.itemName}</span>
                    <span className="text-gray-400 text-sm ml-auto">{item.category}</span>
                  </label>
                ))}
              </div>

              {selectedItems.length === 0 && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ Please select at least one item to download the report.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📊 Select Format
            </h2>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="daily">Daily Breakdown</option>
              <option value="weekly">Weekly Breakdown</option>
              <option value="monthly">Monthly Breakdown</option>
            </select>
          </div>

          {/* Download Button */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={() => {
                if (selectedFormat === "daily") {
                  downloadDailySalesReport();
                } else if (selectedFormat === "weekly") {
                  downloadWeeklySalesReport();
                } else if (selectedFormat === "monthly") {
                  downloadMonthlySalesReport();
                }
              }}
              disabled={loading || (showItemSelection && selectedItems.length === 0)}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download {selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1)} Report
                </>
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <span className="font-bold">ℹ️ Report Format:</span> The report will include {
                selectedCategory === "all" 
                  ? "ALL items from ALL categories" 
                  : showItemSelection && selectedItems.length > 0
                    ? `${selectedItems.length} selected items from ${selectedCategory} category`
                    : `all items in ${selectedCategory} category`
              } with {selectedFormat} sales breakdown showing Online (Zomato + Swiggy) and Offline (Dining + Parcel) quantities, along with totals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
