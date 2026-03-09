import React, { useEffect, useState, useMemo } from "react";
import customFetch from "../../utils/customFetch";
import {
  Plus,
  Edit,
  Trash,
  Users,
  Calendar,
  TrendingUp,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

/* ------------------------------------------------
   UTILITY (MUST BE ABOVE STATE)
------------------------------------------------ */
const getISTDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const CreateAgent_Android = () => {
  /* ------------------------------------------------
     STATE
  ------------------------------------------------ */
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [progressList, setProgressList] = useState([]);
  const [todayTarget, setTodayTarget] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState([]);

  const [form, setForm] = useState({
    customerName: { en: "" },
    email: "",
    password: "",
    mobileNumber: "",
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterName, setFilterName] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [dailyDate, setDailyDate] = useState(getISTDate());
  const [dailyQualifiedSet, setDailyQualifiedSet] = useState(null);

  const getCurrentMonth = () =>
    String(new Date().getMonth() + 1).padStart(2, "0");
  const getCurrentYear = () => String(new Date().getFullYear());

  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  const [monthlyQualifiedSet, setMonthlyQualifiedSet] = useState(null);
  const [report, setReport] = useState(null);

  const [targetForm, setTargetForm] = useState({
    targetType: "shopVisit",
    shopVisitTarget: "",
    orderTarget: "",
    amountLevelTarget: "",
  });

  const navigate = useNavigate();
  const lang = useLanguage();

  /* ------------------------------------------------
     STATUS + PROGRESS
  ------------------------------------------------ */
  const getStatus = (p) => {
    if (!p) return { label: "NOT STARTED", color: "text-gray-500" };

    const noProgress =
      (p.orderProgress || 0) === 0 &&
      (p.shopVisitProgress || 0) === 0 &&
      (p.amountLevelProgress || 0) === 0;

    const aboveTarget =
      ((p.orderTarget || 0) > 0 && p.orderProgress > p.orderTarget) ||
      ((p.shopVisitTarget || 0) > 0 &&
        p.shopVisitProgress > p.shopVisitTarget) ||
      ((p.amountLevelTarget || 0) > 0 &&
        p.amountLevelProgress > p.amountLevelTarget);

    if (noProgress) return { label: "NOT STARTED", color: "text-gray-500" };
    if (aboveTarget) return { label: "ABOVE TARGET", color: "text-teal-600" };

    return { label: "PENDING", color: "text-gray-700" };
  };

  /* ------------------------------------------------
     FETCH FUNCTIONS
  ------------------------------------------------ */
  const fetchAgents = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await customFetch.get("/customer", {
        params: { type: "agent", page: currentPage, limit: 10 },
      });
      setAgents(res.data.customers || []);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id) => {
    try {
      await customFetch.delete(`/customer/${id}`);
      alert("Agent deleted successfully");
      fetchAgents();
    } catch (error) {
      console.log(error);
      alert("failed to delete data");
    }
  };

  const fetchProgress = async (date) => {
    try {
      const url = date ? `/progress/all/${date}` : "/progress/all";
      const res = await customFetch.get(url);
      setProgressList(res.data.agents || []);
    } catch {
      setProgressList([]);
    }
  };

  const fetchTarget = async (date) => {
    try {
      const d = date || getISTDate();
      const res = await customFetch.get(`/target/${d}`);
      setTodayTarget(res.data.target || null);
    } catch {
      setTodayTarget(null);
    }
  };

  const loadMonthlyQualified = async (m = month, y = year) => {
    try {
      const res = await customFetch.get("/progress/monthly-report", {
        params: { month: m, year: y },
      });

      const qualified = new Set(
        (res.data.report || [])
          .filter((r) => Number(r.completionPercentage) >= 80)
          .map((r) => String(r.agentId))
      );

      setMonthlyQualifiedSet(qualified);
      setDailyQualifiedSet(null); // 🔴 important: avoid conflict
    } catch {
      alert("Could not load monthly report");
      setMonthlyQualifiedSet(null);
    }
  };

  /* ------------------------------------------------
     DAILY QUALIFIED
  ------------------------------------------------ */
  const loadDailyQualified = async (date = dailyDate) => {
    try {
      await fetchProgress(date);

      const res = await customFetch.get("/progress/daily-report", {
        params: { date },
      });

      const qualified = new Set(
        (res.data.report || [])
          .filter((r) => Number(r.completionPercentage) >= 80)
          .map((r) => String(r.agentId))
      );

      setDailyQualifiedSet(qualified);
      setMonthlyQualifiedSet(null);
    } catch {
      alert("Could not load daily report");
      setDailyQualifiedSet(null);
    }
  };

  const clearAllQualifiedFilters = () => {
    setMonthlyQualifiedSet(null);
    setDailyQualifiedSet(null);
    setReport(null);
  };

  /* ------------------------------------------------
     LIFE CYCLE
  ------------------------------------------------ */
  useEffect(() => {
    fetchTarget();
    fetchProgress();
  }, []);

  useEffect(() => {
    fetchAgents(page);
  }, [page]);

  useEffect(() => {
    applyFiltersLocal();
  }, [
    agents,
    progressList,
    filterName,
    statusFilter,
    monthlyQualifiedSet,
    dailyQualifiedSet,
  ]);

  /* ------------------------------------------------
     FILTERING
  ------------------------------------------------ */
  const applyFiltersLocal = () => {
    let list = [...agents];

    if (filterName.trim()) {
      list = list.filter((a) =>
        (a.customerName?.en || "")
          .toLowerCase()
          .includes(filterName.toLowerCase())
      );
    }

    if (statusFilter !== "ALL") {
      list = list.filter((a) => {
        const p = progressList.find((x) => x.agentId?._id === a._id);
        return getStatus(p).label === statusFilter;
      });
    }

    if (dailyQualifiedSet) {
      list = list.filter((a) => dailyQualifiedSet.has(String(a._id)));
    }

    if (monthlyQualifiedSet) {
      list = list.filter((a) => monthlyQualifiedSet.has(String(a._id)));
    }

    setFilteredAgents(list);
  };

  const applyFiltersClicked = async () => {
    if (filterDate) {
      await fetchProgress(filterDate);
      await fetchTarget(filterDate);
    } else {
      await fetchProgress();
      await fetchTarget();
    }
  };

  const resetAll = async () => {
    setFilterName("");
    setFilterDate("");
    setStatusFilter("ALL");
    clearAllQualifiedFilters();
    await fetchProgress();
    await fetchTarget();
  };

  const submitTarget = async () => {
    try {
      const payload = {
        targetType: targetForm.targetType,
        shopVisitTarget: Number(targetForm.shopVisitTarget) || 0,
        orderTarget: Number(targetForm.orderTarget) || 0,
        amountLevelTarget: Number(targetForm.amountLevelTarget) || 0,
      };
      await customFetch.post("/target/assign", payload);
      alert("Target updated");
      await fetchTarget(filterDate || undefined);
    } catch {
      alert("Cannot update target");
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        customerName: {
          en: form.customerName.en,
        },
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
        mobileNumber: form.mobileNumber,
      };

      if (editingAgent) {
        await customFetch.patch(`/customer/${editingAgent._id}`, payload);
        alert("Agent updated");
      } else {
        await customFetch.post("/customer/agent", payload);
        alert("Agent created");
      }

      setShowModal(false);
      setEditingAgent(null);
      setForm({
        customerName: { en: "" },
        email: "",
        password: "",
        mobileNumber: "",
      });

      await fetchAgents();
      await fetchProgress(filterDate || undefined);
    } catch {
      alert("Unable to save agent");
    }
  };

  /* ------------------------------------------------
     LOOKUP
  ------------------------------------------------ */
  const progressLookup = useMemo(() => {
    const m = new Map();
    progressList.forEach((p) => p?.agentId?._id && m.set(p.agentId._id, p));
    return m;
  }, [progressList]);

  /* ------------------------------------------------
     UI
  ------------------------------------------------ */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        {/* ------------------------------------------------
            DASHBOARD CARDS — Soft Flat Design
        ------------------------------------------------ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Total Agents",
              value: agents.length,
              icon: <Users className="w-6 h-6 text-teal-600" />,
              bg: "bg-teal-50",
            },
            {
              label: "Today's Target",
              value: todayTarget?.targetType || "None",
              icon: <Calendar className="w-6 h-6 text-teal-600" />,
              bg: "bg-teal-50",
            },
            {
              label: "Visit Target",
              value: todayTarget?.shopVisitTarget || 0,
              icon: <TrendingUp className="w-6 h-6 text-teal-600" />,
              bg: "bg-teal-50",
            },
            {
              label: "Order Target",
              value: todayTarget?.orderTarget || 0,
              icon: <ShoppingCart className="w-6 h-6 text-teal-600" />,
              bg: "bg-teal-50",
            },
            {
              label: "Amount Target",
              value: `₹${todayTarget?.amountLevelTarget || 0}`,
              icon: <DollarSign className="w-6 h-6 text-teal-600" />,
              bg: "bg-teal-50",
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`
        ${card.bg}
        border border-gray-200 rounded-md p-6 min-h-[130px]
        flex flex-col items-center justify-center text-center
        
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-md hover:shadow-gray-300
      `}
            >
              <div className="mb-2">{card.icon}</div>
              <p className="text-gray-700 text-sm">{card.label}</p>
              <h2 className="text-2xl font-semibold text-gray-900 mt-1">
                {card.value}
              </h2>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------
            FILTER SECTION — Clean, Flat Form
        ------------------------------------------------ */}
        <div className="bg-slate-50 border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Filters</h3>

          {/* MAIN ROW: 65% FILTERS + 5% GAP + 30% BUTTONS */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            {/* LEFT SIDE — FILTERS (65%) */}
            <div className="w-full md:w-[65%] grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-gray-700 text-sm">Name</label>
                <input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search name"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm">Status</label>
                <select
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="NOT STARTED">Not Started</option>
                  <option value="PENDING">Pending</option>
                  <option value="FINISHED">Finished</option>
                  <option value="ABOVE TARGET">Above Target</option>
                </select>
              </div>
            </div>

            {/* RIGHT SIDE — BUTTONS (30%) */}
            <div className="w-full md:w-[30%] flex gap-4">
              <button
                className="w-1/2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                onClick={applyFiltersClicked}
              >
                Apply
              </button>

              <button
                className="w-1/2 px-4 py-2 bg-gray-300 rounded-md text-gray-700 hover:bg-gray-400"
                onClick={resetAll}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Filter (≥ 80%)</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="border rounded-md h-10 px-3"
            />

            <button
              onClick={() => loadDailyQualified(dailyDate)}
              className="bg-teal-600 text-white px-4 py-2 rounded-md"
            >
              Load Daily
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Filter (≥ 80%)</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <input
              type="month"
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setYear(y);
                setMonth(m);
              }}
              className="border rounded-md h-10 px-3"
            />

            <button
              onClick={() => loadMonthlyQualified(month, year)}
              className="bg-teal-600 text-white px-4 py-2 rounded-md"
            >
              Load Monthly
            </button>
          </div>
        </div>

        {/* ------------------------------------------------
            QUICK TARGET — Soft, flat input layout
        ------------------------------------------------ */}
        <div className="bg-slate-50 border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Quick Target (Today)
          </h3>

          {/* GRID (1 / 3 layout with spacing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Type */}
            <div>
              <label className="text-sm text-gray-700">Target Type</label>
              <select
                value={targetForm.targetType}
                onChange={(e) =>
                  setTargetForm({
                    ...targetForm,
                    targetType: e.target.value,
                    shopVisitTarget: "",
                    orderTarget: "",
                    amountLevelTarget: "",
                  })
                }
                className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="shopVisit">Shop Visit</option>
                <option value="orderTaken">Order Taken</option>
                <option value="amountLevel">Amount Level</option>
                <option value="allOfThem">All</option>
              </select>
            </div>

            {/* Conditional Inputs */}
            {["shopVisit", "allOfThem"].includes(targetForm.targetType) && (
              <div>
                <label className="text-sm text-gray-700">Visit Target</label>
                <input
                  type="number"
                  value={targetForm.shopVisitTarget}
                  onChange={(e) =>
                    setTargetForm({
                      ...targetForm,
                      shopVisitTarget: e.target.value,
                    })
                  }
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}

            {["orderTaken", "allOfThem"].includes(targetForm.targetType) && (
              <div>
                <label className="text-sm text-gray-700">Order Target</label>
                <input
                  type="number"
                  value={targetForm.orderTarget}
                  onChange={(e) =>
                    setTargetForm({
                      ...targetForm,
                      orderTarget: e.target.value,
                    })
                  }
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}

            {["amountLevel", "allOfThem"].includes(targetForm.targetType) && (
              <div>
                <label className="text-sm text-gray-700">
                  Amount Target (₹)
                </label>
                <input
                  type="number"
                  value={targetForm.amountLevelTarget}
                  onChange={(e) =>
                    setTargetForm({
                      ...targetForm,
                      amountLevelTarget: e.target.value,
                    })
                  }
                  className="w-full h-10 mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}
          </div>
          {/* BUTTON */}
          <div className="flex justify-end">
            <button
              onClick={submitTarget}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
            >
              Update Target
            </button>
          </div>
        </div>

        {/* ------------------------------------------------
            AGENTS TABLE — Soft borders, flat design
        ------------------------------------------------ */}
        <div className="bg-slate-50 border border-gray-200 rounded-md p-6">
          {/* Add Incentive Button */}
          <button
            disabled={selectedAgents.length === 0}
            onClick={() =>
              navigate(`/${lang}/admin/android/incentive`, {
                state: { agents: selectedAgents },
              })
            }
            className={`px-4 py-2 rounded-md transition ${
              selectedAgents.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
            }`}
          >
            Add Incentive
          </button>

          {/* Header Row */}
          <div className="flex justify-between items-center mt-6 mb-4">
            <h2 className="text-xl font-semibold text-teal-700">
              Agent Management
            </h2>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition shadow-sm inline-flex items-center gap-2"
            >
              <Plus size={18} /> Add Agent
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
            <table className="w-full text-left border-collapse text-sm table-fixed">
              <thead>
                <tr className="bg-gray-400 text-gray-700">
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedAgents.length === filteredAgents.length &&
                        filteredAgents.length > 0
                      }
                      onChange={() => {
                        if (selectedAgents.length === filteredAgents.length) {
                          setSelectedAgents([]);
                        } else {
                          setSelectedAgents(
                            filteredAgents.map((a) => ({
                              _id: a._id,
                              customerName: a.customerName?.en,
                              ...a,
                            }))
                          );
                        }
                      }}
                    />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Visit</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredAgents.map((a) => {
                  const p = progressLookup.get(a._id);
                  const status = getStatus(p);

                  return (
                    <tr
                      key={a._id}
                      onClick={() =>
                        navigate(
                          `/${lang}/admin/android/track_android/${a._id}`
                        )
                      }
                      className="border-b hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedAgents.some((x) => x._id === a._id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            const exists = selectedAgents.some(
                              (x) => x._id === a._id
                            );
                            if (exists) {
                              setSelectedAgents((prev) =>
                                prev.filter((x) => x._id !== a._id)
                              );
                            } else {
                              setSelectedAgents((prev) => [...prev, a]);
                            }
                          }}
                        />
                      </td>

                      <td className="p-3">{a.customerName?.en}</td>
                      <td className="p-3">{a.email}</td>
                      <td className="p-3">
                        {p ? `${p.orderProgress}/${p.orderTarget}` : "0/0"}
                      </td>
                      <td className="p-3">
                        {p
                          ? `${p.shopVisitProgress}/${p.shopVisitTarget}`
                          : "0/0"}
                      </td>
                      <td className="p-3">
                        ₹{p?.amountLevelProgress || 0} / ₹
                        {p?.amountLevelTarget || 0}
                      </td>
                      <td className={`p-3 font-medium ${status.color}`}>
                        {status.label}
                      </td>

                      <td className="p-3">
                        <div
                          className="flex justify-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingAgent(a);
                              console.log(a, "Edit data");
                              setForm({
                                customerName: {
                                  en: a.customerName?.en || "",
                                },
                                email: a.email || "",
                                password: "",
                                mobileNumber: a.mobileNumber || "",
                              });

                              setShowModal(true);
                            }}
                            className="text-teal-700 hover:text-teal-800 transition"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => deleteAgent(a._id)}
                            className="text-red-600 hover:text-red-700 transition"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      No agents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className={`px-4 py-2 rounded-md transition ${
                page === 1
                  ? "bg-gray-300"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              Previous
            </button>

            <span className="text-gray-700 font-medium">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={`px-4 py-2 rounded-md transition ${
                page === totalPages
                  ? "bg-gray-300"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              Next
            </button>
          </div>
        </div>

        {/* ------------------------------------------------
            MODAL — Soft clean design
        ------------------------------------------------ */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-200">
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold text-teal-700">
                  {editingAgent ? "Edit Agent" : "Create Agent"}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAgent(null);
                  }}
                >
                  ×
                </button>
              </div>

              {/* Normal Form Layout */}
              <div className="space-y-4">
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-700 font-medium">
                    Full Name
                  </label>
                  <input
                    value={form.customerName.en}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customerName: { en: e.target.value },
                      })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 outline-none 
                       focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter full name"
                  />
                </div>
                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-700 font-medium">
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 outline-none 
                       focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter email address"
                  />
                </div>
                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-700 font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 outline-none 
                       focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-700 font-medium">
                    Mobile Number
                  </label>
                  <input
                    value={form.mobileNumber}
                    onChange={(e) =>
                      setForm({ ...form, mobileNumber: e.target.value })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 outline-none 
                       focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingAgent(null);
                  }}
                  className="px-5 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
                >
                  {editingAgent ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAgent_Android;
