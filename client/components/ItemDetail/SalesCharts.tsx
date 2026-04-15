import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { TrendingUp, BarChart3, Download } from "lucide-react";
import { useState } from "react";

interface MonthlyData {
  month: string;
  zomatoQty: number;
  swiggyQty: number;
  diningQty: number;
  parcelQty: number;
  totalQty: number;
  variations?: {
    zomato: Array<{ name: string; quantity: number; value: number }>;
    swiggy: Array<{ name: string; quantity: number; value: number }>;
    dining: Array<{ name: string; quantity: number; value: number }>;
    parcel: Array<{ name: string; quantity: number; value: number }>;
  };
}

interface DateWiseData {
  date: string;
  zomatoQty: number;
  swiggyQty: number;
  diningQty: number;
  parcelQty: number;
  totalQty: number;
}

interface SalesChartsProps {
  monthlyData: MonthlyData[];
  dateWiseData?: DateWiseData[];
  restaurantSales?: { [key: string]: number };
  zomatoData?: any;
  swiggyData?: any;
  diningData?: any;
  parcelData?: any;
  unitType?: string;
  comparisonMode?: boolean;
  comparisonMonthlyData?: MonthlyData[];
  comparisonDateWiseData?: DateWiseData[];
  comparisonRestaurantSales?: { [key: string]: number };
  dateRange?: { start: string; end: string };
  comparisonDateRange?: { start: string; end: string };
  itemName?: string;
  itemCategory?: string;
  itemGroup?: string;
  itemPrice?: number;
}

const RESTAURANT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
  "#d946ef", "#ec4899", "#f43f5e"
];

const AREA_COLORS = {
  zomato: "#ef4444",
  swiggy: "#f97316",
  dining: "#3b82f6",
  parcel: "#10b981",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Custom tooltip to show both quantity and value with variations
const CustomMonthlyTooltip = ({ active, payload, unitType = "units" }: any) => {
  // Normalize unit display - show KG or QTY only
  const displayUnit = unitType && unitType.toLowerCase().includes("kg") ? "KG" : "QTY";

  if (active && payload && payload.length > 0) {
    const dataPoint = payload[0]?.payload;
    const variations = dataPoint?.variations;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
        <p className="font-bold text-white mb-3">{dataPoint?.month || dataPoint?.date || "Month"}</p>

        {/* Area-wise summary */}
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="text-xs font-medium text-gray-300">
            {entry.name}: {entry.value.toLocaleString()} {displayUnit}
          </p>
        ))}

        {/* Variation breakdown if available */}
        {variations && (
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Variation Breakdown</p>
            {Object.entries(variations).map(([area, vars]: [string, any]) => {
              const areaVars = Array.isArray(vars) ? vars : [];
              if (areaVars.length === 0) return null;

              return (
                <div key={area} className="ml-2">
                  <p className="text-xs font-semibold text-gray-400 capitalize">{area}:</p>
                  {areaVars.map((v: any, idx: number) => (
                    <div key={idx} className="ml-3 text-xs text-gray-300">
                      <div className="flex justify-between gap-4">
                        <span>{v.name}</span>
                        <span className="font-mono">
                          {v.quantity.toLocaleString()} {displayUnit}
                          {v.value ? ` (₹${v.value.toLocaleString()})` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs font-bold text-yellow-400 mt-3 border-t border-gray-700 pt-2">
          Total: {payload.reduce((sum: number, p: any) => sum + p.value, 0).toLocaleString()} {displayUnit}
        </p>
      </div>
    );
  }
  return null;
};

export default function SalesCharts({ 
  monthlyData, 
  dateWiseData, 
  restaurantSales = {}, 
  unitType = "units", 
  dateRange,
  itemName = "Item Name",
  itemCategory = "Category",
  itemGroup = "Group",
  itemPrice = 0
}: SalesChartsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [downloadDateRange, setDownloadDateRange] = useState({ start: dateRange?.start || "", end: dateRange?.end || "" });

  // Download Monthly Excel function
  const downloadMonthlySalesExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      if (!monthlyData || monthlyData.length === 0) {
        alert("No monthly data available");
        return;
      }

      // Filter monthly data to only include months within the selected date range
      const startDate = new Date(downloadDateRange.start);
      const endDate = new Date(downloadDateRange.end);
      
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const startMonth = startDate.getMonth(); // 0-based (Jan = 0)
      const endMonth = endDate.getMonth();

      // Get months within the date range
      const monthsInRange = monthlyData.filter(monthData => {
        const monthIndex = MONTH_NAMES.indexOf(monthData.month);
        if (monthIndex === -1) return false;
        
        // For simplicity, assume all data is from the same year range
        // You can enhance this logic if data spans multiple years
        return monthIndex >= startMonth && monthIndex <= endMonth;
      });

      if (monthsInRange.length === 0) {
        alert("No monthly data available for selected date range");
        return;
      }

      // Create header rows
      const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
      const headerRow2: any[] = ["", "", "", ""];

      // Add month headers with Online/Offline sub-columns
      monthsInRange.forEach((monthData) => {
        headerRow1.push(monthData.month, "");
        headerRow2.push("Online", "Offline");
      });

      // Add Total header
      headerRow1.push("Total", "", "Unit");
      headerRow2.push("Online", "Offline", "");

      // Create data row
      const dataRow: any[] = [
        "HanuRam CCO",
        itemGroup || "Sweet",
        itemName,
        itemCategory,
      ];

      let totalOnline = 0;
      let totalOffline = 0;

      // Add monthly data
      monthsInRange.forEach((monthData) => {
        const online = (monthData.zomatoQty || 0) + (monthData.swiggyQty || 0);
        const offline = (monthData.diningQty || 0) + (monthData.parcelQty || 0);
        
        dataRow.push(online, offline);
        totalOnline += online;
        totalOffline += offline;
      });

      // Add totals
      dataRow.push(totalOnline, totalOffline);
      dataRow.push(unitType && unitType.toLowerCase().includes("kg") ? "KG" : "PC");

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, dataRow]);

      // Merge cells for month headers and Total header
      const merges: any[] = [];
      let colIndex = 4; // Start after first 4 columns

      // Merge month headers
      monthsInRange.forEach(() => {
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

      // Add widths for month columns
      monthsInRange.forEach(() => {
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

          // Header row 1 styling (months and Total)
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
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Sales");

      // Download with styling
      XLSX.writeFile(
        wb,
        `Monthly_Sales_${itemName}_${downloadDateRange.start}_to_${downloadDateRange.end}.xlsx`,
        {
          bookType: "xlsx",
          cellStyles: true,
        }
      );

    } catch (error) {
      console.error("Monthly download failed:", error);
      alert("Failed to download monthly Excel file");
    }
  };

  // Download Weekly Excel function
  const downloadWeeklySalesExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      // Filter data by date range
      const filteredData = (dateWiseData || []).filter(d => {
        return d.date >= downloadDateRange.start && d.date <= downloadDateRange.end;
      });

      if (filteredData.length === 0) {
        alert("No data available for selected date range");
        return;
      }

      // Group data by weeks
      const startDate = new Date(downloadDateRange.start);
      const endDate = new Date(downloadDateRange.end);
      
      // Generate weekly ranges
      const weeklyRanges: Array<{ start: Date; end: Date; label: string }> = [];
      let currentWeekStart = new Date(startDate);
      
      while (currentWeekStart <= endDate) {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6); // Add 6 days to get end of week
        
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
        
        // Move to next week
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      // Aggregate data by weeks
      const weeklyData: { [key: string]: { online: number; offline: number } } = {};
      
      weeklyRanges.forEach((week, index) => {
        const weekKey = `week_${index}`;
        weeklyData[weekKey] = { online: 0, offline: 0 };
        
        filteredData.forEach(d => {
          const dataDate = new Date(d.date);
          if (dataDate >= week.start && dataDate <= week.end) {
            const online = (d.zomatoQty || 0) + (d.swiggyQty || 0);
            const offline = (d.diningQty || 0) + (d.parcelQty || 0);
            
            weeklyData[weekKey].online += online;
            weeklyData[weekKey].offline += offline;
          }
        });
      });

      // Create header rows
      const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
      const headerRow2: any[] = ["", "", "", ""];

      // Add weekly headers
      weeklyRanges.forEach((week) => {
        headerRow1.push(week.label, "");
        headerRow2.push("Online", "Offline");
      });

      // Add Total header
      headerRow1.push("Total", "", "Unit");
      headerRow2.push("Online", "Offline", "");

      // Create data row
      const dataRow: any[] = [
        "HanuRam CCO",
        itemGroup || "Sweet",
        itemName,
        itemCategory,
      ];

      let totalOnline = 0;
      let totalOffline = 0;

      // Add weekly data
      weeklyRanges.forEach((_, index) => {
        const weekKey = `week_${index}`;
        const online = weeklyData[weekKey].online;
        const offline = weeklyData[weekKey].offline;
        
        dataRow.push(online, offline);
        totalOnline += online;
        totalOffline += offline;
      });

      // Add totals
      dataRow.push(totalOnline, totalOffline);
      dataRow.push(unitType && unitType.toLowerCase().includes("kg") ? "KG" : "PC");

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, dataRow]);

      // Merge cells for weekly headers and Total header
      const merges: any[] = [];
      let colIndex = 4; // Start after first 4 columns

      // Merge weekly headers
      weeklyRanges.forEach(() => {
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

      // Add widths for weekly columns
      weeklyRanges.forEach(() => {
        colWidths.push({ wch: 12 }); // Online
        colWidths.push({ wch: 12 }); // Offline
      });

      colWidths.push({ wch: 12 }); // Total Online
      colWidths.push({ wch: 12 }); // Total Offline
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

          // Header row 1 styling (weekly ranges and Total)
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
      XLSX.utils.book_append_sheet(wb, ws, "Weekly Sales");

      // Download with styling
      XLSX.writeFile(
        wb,
        `Weekly_Sales_${itemName}_${downloadDateRange.start}_to_${downloadDateRange.end}.xlsx`,
        {
          bookType: "xlsx",
          cellStyles: true,
        }
      );

    } catch (error) {
      console.error("Weekly download failed:", error);
      alert("Failed to download weekly Excel file");
    }
  };

  // Download Excel function with Online/Offline split and styling
  const downloadDailySalesExcel = async (downloadType: "item" | "category") => {
    try {
      const XLSX = await import("xlsx");
      
      // Fetch data based on download type
      let apiUrl = "";
      if (downloadType === "item") {
        // Download only this item's data - use existing dateWiseData
        const filteredData = (dateWiseData || []).filter(d => {
          return d.date >= downloadDateRange.start && d.date <= downloadDateRange.end;
        });

        if (filteredData.length === 0) {
          alert("No data available for selected date range");
          return;
        }

        // Create Excel for single item
        const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
        const headerRow2: any[] = ["", "", "", ""];

        // Add date headers
        filteredData.forEach((d) => {
          const formatted = new Date(d.date).toLocaleDateString("en-GB");
          headerRow1.push(formatted, "");
          headerRow2.push("Online", "Offline");
        });

        // Add Total header
        headerRow1.push("Total", "", "Unit");
        headerRow2.push("Online", "Offline", "");

        // Create data row
        const dataRow: any[] = [
          "HanuRam CCO",
          itemGroup || "Sweet",
          itemName,
          itemCategory,
        ];

        let totalOnline = 0;
        let totalOffline = 0;

        filteredData.forEach((d) => {
          const online = (d.zomatoQty || 0) + (d.swiggyQty || 0);
          const offline = (d.diningQty || 0) + (d.parcelQty || 0);
          dataRow.push(online, offline);
          totalOnline += online;
          totalOffline += offline;
        });

        dataRow.push(totalOnline, totalOffline);
        dataRow.push(unitType && unitType.toLowerCase().includes("kg") ? "KG" : "PC");

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, dataRow]);

        // Merge cells
        const merges: any[] = [];
        let colIndex = 4;
        filteredData.forEach(() => {
          merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
          colIndex += 2;
        });
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        ws["!merges"] = merges;

        // Column widths
        const colWidths = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 18 }];
        filteredData.forEach(() => {
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
        XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");
        XLSX.writeFile(wb, `Daily_Sales_${itemName}_${downloadDateRange.start}_to_${downloadDateRange.end}.xlsx`, {
          bookType: "xlsx",
          cellStyles: true,
        });

      } else {
        // Download category data - fetch from API
        apiUrl = `/api/sales/daily-report?startDate=${downloadDateRange.start}&endDate=${downloadDateRange.end}&category=${encodeURIComponent(itemCategory)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch sales data");
        }

        const data = await response.json();
        if (!data.success || !data.data || data.data.length === 0) {
          alert("No data available for selected date range and category");
          return;
        }

        // Group data by item
        const itemMap: any = {};
        data.data.forEach((sale: any) => {
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

        // Get all unique dates sorted
        const allDates = Array.from(new Set(data.data.map((sale: any) => sale.date))).sort();

        // Create header rows
        const headerRow1: any[] = ["restaurant_name", "brand_grouping", "item_name", "category_name"];
        const headerRow2: any[] = ["", "", "", ""];

        allDates.forEach((date: string) => {
          const formatted = new Date(date).toLocaleDateString("en-GB");
          headerRow1.push(formatted, "");
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

          allDates.forEach((date: string) => {
            const online = item.dates[date]?.online || 0;
            const offline = item.dates[date]?.offline || 0;
            row.push(online, offline);
            totalOnline += online;
            totalOffline += offline;
          });

          row.push(totalOnline, totalOffline, "KG");
          dataRows.push(row);
        });

        // Sort by item name
        dataRows.sort((a, b) => a[2].localeCompare(b[2]));

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

        // Merge cells
        const merges: any[] = [];
        let colIndex = 4;
        allDates.forEach(() => {
          merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
          colIndex += 2;
        });
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        ws["!merges"] = merges;

        // Column widths
        const colWidths = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 18 }];
        allDates.forEach(() => {
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
        XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");
        XLSX.writeFile(wb, `Daily_Sales_${itemCategory}_${downloadDateRange.start}_to_${downloadDateRange.end}.xlsx`, {
          bookType: "xlsx",
          cellStyles: true,
        });
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download Excel file");
    }
  };

  // Create tooltip component with unitType bound
  const TooltipWithUnit = (props: any) => <CustomMonthlyTooltip {...props} unitType={unitType} />;

  // Create data for all 12 months (fill missing months with 0)
  const allMonthsData = MONTH_NAMES.map(month => {
    const found = monthlyData.find(d => d.month === month);
    return found || {
      month,
      zomatoQty: 0,
      swiggyQty: 0,
      diningQty: 0,
      parcelQty: 0,
      totalQty: 0,
    };
  });

  // Convert restaurantSales object to array for pie chart
  const restaurantData = Object.entries(restaurantSales || {})
    .map(([name, quantity]) => ({ name, value: quantity }))
    .sort((a, b) => b.value - a.value);

  // Filter date-wise data if a month is selected
  const filteredDateWiseData = selectedMonth && dateWiseData
    ? (() => {
        const monthNum = MONTH_NAMES.indexOf(selectedMonth) + 1;
        const monthPadded = String(monthNum).padStart(2, '0');
        return dateWiseData.filter(d => {
          // dateWiseData has dates in YYYY-MM-DD format
          // Extract the month part and compare
          const dateMonth = d.date.split('-')[1];
          return dateMonth === monthPadded;
        });
      })()
    : dateWiseData;

  return (
    <div className="space-y-6">
      {/* Monthly Sales Quantity Chart - All 12 Months with Stacked Bars */}
      <div className="bg-gray-950/95 rounded-2xl p-8 border border-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-yellow-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Monthly Sales Quantity</h2>
            <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest font-semibold">Area-wise sales across all 12 months</p>
          </div>
        </div>

        <div className="w-full h-96 bg-slate-900/50 rounded-xl p-6 border border-gray-800/30">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={allMonthsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <defs>
                <linearGradient id="dailySalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0.75} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#4b5563" vertical={true} opacity={0.3} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                label={{ value: 'Qty', angle: -90, position: 'insideLeft', offset: 5, style: { fill: '#9ca3af', fontSize: 11 } }}
              />
              <Tooltip
                content={<TooltipWithUnit />}
                cursor={{ fill: "rgba(168, 85, 247, 0.08)" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "24px", fontSize: 12 }}
                iconType="circle"
                verticalAlign="top"
              />
              <Bar
                dataKey="totalQty"
                fill="url(#dailySalesGradient)"
                name="Daily Sales"
                isAnimationActive={true}
                animationDuration={600}
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => {
                  if (data?.month) {
                    setSelectedMonth(data.month);
                  }
                }}
                cursor="pointer"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Date-wise Daily Sales Chart */}
      {dateWiseData && dateWiseData.length > 0 && filteredDateWiseData && filteredDateWiseData.length > 0 && (
        <div className="bg-gray-950/95 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Daily Sales Breakdown
                </h2>
                {selectedMonth && (
                  <p className="text-xs text-yellow-500/80 font-semibold mt-1 uppercase tracking-widest">📅 Filtered by {selectedMonth}</p>
                )}
              </div>
            </div>
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 text-xs font-bold transition hover:border-gray-600"
              >
                ✕ Clear Filter
              </button>
            )}
          </div>

          {/* Download Section */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-semibold mb-1.5 block">Start Date</label>
                  <input
                    type="date"
                    value={downloadDateRange.start}
                    onChange={(e) => setDownloadDateRange({ ...downloadDateRange, start: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold mb-1.5 block">End Date</label>
                  <input
                    type="date"
                    value={downloadDateRange.end}
                    onChange={(e) => setDownloadDateRange({ ...downloadDateRange, end: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadDailySalesExcel("item")}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-900/30"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </button>
                <button
                  onClick={() => downloadWeeklySalesExcel()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30"
                >
                  <Download className="w-4 h-4" />
                  Weekly Data
                </button>
                <button
                  onClick={() => downloadMonthlySalesExcel()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30"
                >
                  <Download className="w-4 h-4" />
                  Monthly Data
                </button>
              </div>
            </div>
          </div>

          <div className="w-full h-96 bg-slate-900/50 rounded-xl p-6 border border-gray-800/30">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredDateWiseData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <defs>
                  <linearGradient id="zomatoGradientDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="swiggyGradientDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="diningGradientDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="parcelGradientDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#4b5563" vertical={true} opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 500 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  label={{ value: 'Qty', angle: -90, position: 'insideLeft', offset: 5, style: { fill: '#9ca3af', fontSize: 11 } }}
                />
                <Tooltip
                  content={<CustomMonthlyTooltip />}
                  cursor={{ fill: "rgba(34, 197, 94, 0.1)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "24px", fontSize: 12 }}
                  iconType="square"
                />
                <Bar
                  dataKey="zomatoQty"
                  stackId="daily"
                  fill="url(#zomatoGradientDaily)"
                  name="Zomato"
                  isAnimationActive={true}
                  animationDuration={600}
                />
                <Bar
                  dataKey="swiggyQty"
                  stackId="daily"
                  fill="url(#swiggyGradientDaily)"
                  name="Swiggy"
                  isAnimationActive={true}
                  animationDuration={600}
                />
                <Bar
                  dataKey="diningQty"
                  stackId="daily"
                  fill="url(#diningGradientDaily)"
                  name="Dining"
                  isAnimationActive={true}
                  animationDuration={600}
                />
                <Bar
                  dataKey="parcelQty"
                  stackId="daily"
                  fill="url(#parcelGradientDaily)"
                  name="Parcel"
                  isAnimationActive={true}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

    </div>
  );
}
