import { BarChart3, Download, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-xl">
            <BarChart3 className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Reports</h1>
            <p className="text-gray-400 text-sm mt-1">Download sales and inventory reports</p>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Day-wise Sales Data */}
          <div 
            onClick={() => navigate("/reports/daily-sales")}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-500/20 p-2 rounded-lg group-hover:bg-green-500/30 transition-all">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Day-wise Sales Data</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Download day-wise sales breakdown with online/offline split
            </p>
            <div className="flex items-center justify-between text-green-400 font-bold group-hover:text-green-300 transition-colors">
              <span>Open Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Item-wise Sales */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Item-wise Sales</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Complete sales report for all items with variations
            </p>
            <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>

          {/* Inventory Report */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Inventory Report</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Current inventory status with pricing details
            </p>
            <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">More Reports Coming Soon</h3>
          <p className="text-gray-500 text-sm">
            We're working on adding more report types including profit analysis, channel comparison, and custom reports.
          </p>
        </div>
      </div>
    </div>
  );
}
