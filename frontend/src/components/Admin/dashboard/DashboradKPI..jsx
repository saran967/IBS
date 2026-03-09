import {
  MdAttachMoney,
  MdInventory,
  MdPerson,
  MdSwapHoriz,
} from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";

const KPIBox = ({ icon, title, value, subtitle, color, gradient, path }) => {
  const navigate = useNavigate();
  const { lang } = useParams();

  const userLang = lang || "en";
  return (
    <div
      onClick={() => path && navigate(`/${userLang}${path}`)}
      className={`
        w-full h-40 p-5 flex items-center gap-5 rounded-2xl shadow-lg 
        bg-white/80 backdrop-blur-md 
        border border-gray-200/50 relative overflow-hidden 
        transition-all duration-300 
        hover:-translate-y-1 hover:shadow-2xl cursor-pointer

      `}
    >
      {/* Glow Effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}40, transparent, ${color}40)`,
          opacity: 0.25,
        }}
      />

      {/* Top Gradient Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: gradient }}
      ></div>

      {/* Icon Box */}
      <div
        className="w-20 h-20 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
        style={{
          background: gradient,
          boxShadow: `0 8px 20px ${color}50`,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
          {title}
        </p>

        <p className="text-3xl font-bold text-gray-900 mt-1 leading-tight">
          {value}
        </p>

        <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

export default function DashboardKPI({ summary = {} }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 w-full">
      <KPIBox
        icon={<MdAttachMoney size={32} />}
        title="Today's Sales"
        value={`₹${summary.todaySales || 0}`}
        subtitle="Revenue generated today"
        color="#F59E0B"
        gradient="linear-gradient(135deg, #F59E0B, #D97706)"
        path="/admin/sales/list"
      />

      <KPIBox
        icon={<MdInventory size={32} />}
        title="Total Products"
        value={summary.totalProducts || 0}
        subtitle={`${summary.lowStockProducts || 0} low in stock`}
        color="#3B82F6"
        gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
        path="/admin/inventory"
      />

      <KPIBox
        icon={<MdPerson size={32} />}
        title="Customers"
        value={summary.totalCustomers || 0}
        subtitle={"Active customers"}
        color="#10B981"
        gradient="linear-gradient(135deg, #10B981, #059669)"
        path="/admin/customer"
      />

      <KPIBox
        icon={<MdSwapHoriz size={32} />}
        title="Pending Transfers"
        value={summary.pendingTransfers || 0}
        subtitle="Awaiting approval"
        color="#EF4444"
        gradient="linear-gradient(135deg, #EF4444, #DC2626)"
        path="/admin/stock-transfer"
      />
    </div>
  );
}
