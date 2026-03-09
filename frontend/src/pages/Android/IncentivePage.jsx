import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  Database,
} from "lucide-react";

const IncentivePage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const selectedAgents = state?.agents || [];

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editValues, setEditValues] = useState({});
  // const [actionExpanded, setActionExpanded] = useState(null);
  // const [detailsExpanded, setDetailsExpanded] = useState(null);

  const today = new Date();

  const [filterDay, setFilterDay] = useState(today.getDate());
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(today.getFullYear());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [incentives, setIncentives] = useState([]);
  const [openCard, setOpenCard] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  // const [date, setDate] = useState(new Date().toLocaleString);

  const loadIncentives = async (
    currentPage = 1,
    d = filterDay,
    m = filterMonth,
    y = filterYear
  ) => {
    try {
      const dayParam = d === "all" ? "" : `&day=${d}`;
      const monthParam = m === "all" ? "" : `&month=${m}`;
      const yearParam = y === "all" ? "" : `&year=${y}`;

      const res = await customFetch.get(
        `/incentive/daily?page=${currentPage}${dayParam}${monthParam}${yearParam}`
      );

      // SORT by highest amount first
      const sorted = [...res.data.data].sort((a, b) => b.amount - a.amount);

      setIncentives(sorted);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (err) {
      console.error(err);
      alert("Failed to load incentive records");
    }
  };

  const toggleAction = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const updateAgentIncentive = async (item, newValue) => {
    if (!newValue) {
      alert("Enter a value");
      return;
    }

    try {
      console.log("Updating agent:", item.agentId, "with value:", newValue);

      // Example API call (adjust to your backend route)
      await customFetch.patch("/incentive/update", {
        agentId: item.agentId,
        // incentiveId: item.incentiveId,
        amount: newValue,
      });

      alert("Updated successfully");
      loadIncentives(1, filterDay, filterMonth, filterYear);
      agentDetails();
      // refresh data
      // loadIncentives();
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
  };

  const [agents, setAgents] = useState([]);

  const [agentMap, setAgentMap] = useState({});

  const agentDetails = async () => {
    try {
      const res = await customFetch.get("/customer");

      const map = {};
      res.data.customers.forEach((agent) => {
        map[agent._id] = {
          name: agent.customerName?.en,
          totalIncentive: agent.totalIncentive,
        };
      });

      setAgentMap(map);
      setAgents(res.data.customers);
    } catch (error) {
      alert("Failed to fetch the agent details");
    }
  };

  const handleInputChange = (id, value) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  useEffect(() => {
    agentDetails();
  }, []);

  useEffect(() => {
    loadIncentives(1, filterDay, filterMonth, filterYear);
  }, [filterDay, filterMonth, filterYear]);

  useEffect(() => {
    loadIncentives(page, filterDay, filterMonth, filterYear);
  }, [page]);

  const submitIncentive = async () => {
    if (!amount || !purpose) {
      alert("Please fill all fields before submitting.");
      return;
    }

    setLoading(true);

    try {
      await customFetch.post("/incentive/create", {
        agents: selectedAgents,
        amount,
        purpose,
        month,
        year,
      });

      alert("Incentive added successfully!");
      loadIncentives();
    } catch (error) {
      console.error(error);
      alert("Failed to submit incentive");
    } finally {
      setLoading(false);
    }
  };

  const getText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return val.en || val.ta || "";
    return "";
  };


  const toggleCard = (id) => {
    setOpenCard(openCard === id ? null : id);
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (!selectedAgents || selectedAgents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-md shadow-lg p-12 text-center max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            No Agents Selected
          </h2>
          <p className="text-gray-600 mb-8">
            Please select agents to add incentives
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  let filteredData = incentives;

  if (searchTerm.trim() !== "") {
    filteredData = filteredData.filter((i) =>
      i.agentName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Incentive Management
          </h1>
          <p className="text-gray-600">
            Manage and track agent incentives efficiently
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Add New Incentive
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="mb-6">
                <p className="font-semibold text-gray-800 mb-4 flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2 text-teal-600" />
                  Selected Agents ({selectedAgents.length})
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedAgents.map((agent) => (
                    <div
                      key={agent._id}
                      className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg px-4 py-3 hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-sm font-medium text-teal-800 block">
                        {agent.customerName?.en}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-800 mb-3 flex items-center text-sm">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-600" />
                    Incentive Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md  focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className=" font-semibold text-gray-800 mb-3 flex items-center text-sm">
                    <FileText className="w-4 h-4 mr-2 text-gray-600" />
                    Purpose / Description
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none text-sm"
                    value={purpose}
                    rows={3}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Incentive given for..."
                  ></textarea>
                </div>

                <div>
                  <label className="font-semibold text-gray-800 mb-3 flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                    Month
                  </label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {[...Array(12).keys()].map((m) => (
                      <option key={m + 1} value={m + 1}>
                        {new Date(0, m).toLocaleString("default", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className=" font-semibold text-gray-800 mb-3 flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                    Year
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-16">
                <button
                  onClick={submitIncentive}
                  disabled={loading}
                  className={`px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 text-sm shadow-md ${loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 hover:shadow-lg active:scale-[0.98]"
                    }`}
                >
                  {loading ? "Submitting..." : "Submit Incentive"}
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all duration-200 active:scale-[0.98] text-sm border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              Filters & Summary
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <label className="block font-semibold text-gray-800 mb-3 text-sm">
                Search Agent
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-800 mb-3 text-sm">
                Filter Day
              </label>
              <select
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                value={filterDay}
                onChange={(e) => setFilterDay(Number(e.target.value))}
              >
                <option value="all">All Days</option>
                {[...Array(31).keys()].map((d) => (
                  <option key={d + 1} value={d + 1}>
                    {d + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-800 mb-3 text-sm">
                Filter Month
              </label>
              <select
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
              >
                <option value="all">All Months</option>
                {[...Array(12).keys()].map((m) => (
                  <option key={m + 1} value={m + 1}>
                    {new Date(0, m).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-800 mb-3 text-sm">
                Filter Year
              </label>
              <select
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
              >
                <option value="all">All Years</option>
                {Array.from(new Set(incentives.map((i) => i.year))).map(
                  (yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-teal-100">
                  Total Amount
                </p>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5" color="teal" />
                </div>
              </div>
              <p className="text-3xl font-bold">
                ₹
                {incentives
                  .reduce((total, inc) => total + inc.amount, 0)
                  .toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-100">
                  Total Records
                </p>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5" color="blue" />
                </div>
              </div>
              <p className="text-3xl font-bold">{incentives.length}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-purple-100">
                  Filtered Results
                </p>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5" color="purple" />
                </div>
              </div>
              <p className="text-3xl font-bold">{filteredData.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Incentive Records
            </h2>
          </div>

          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  No incentive records found
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Purpose
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Agents
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Total Incentive
                      </th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((item) => (
                      <React.Fragment key={item.agentId + item.incentiveId}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          {/* PURPOSE */}
                          <td className="py-5 px-6">
                            <p className="text-sm font-semibold text-gray-800">
                              {item.purpose}
                            </p>
                          </td>

                          {/* AMOUNT */}
                          <td className="py-5 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-sm">
                              ₹{item.amount.toLocaleString()}
                            </span>
                          </td>

                          {/* PERIOD */}
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 font-medium">
                                {new Date(0, item.month - 1).toLocaleString(
                                  "default",
                                  { month: "short" }
                                )}{" "}
                                {item.year}
                              </span>
                            </div>
                          </td>

                          {/* AGENT NAME */}
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 font-medium">
                                {typeof item.agentName === "object"
                                  ? item.agentName?.en
                                  : item.agentName}
                              </span>
                            </div>
                          </td>

                          <td className="py-5 px-6">
                            <span className="text-sm font-semibold text-gray-800">
                              ₹
                              {agentMap[
                                item.agentId
                              ]?.totalIncentive?.toLocaleString() || 0}
                            </span>
                          </td>

                          {/* ACTION BUTTON */}
                          <td className="py-5 px-6">
                            <div className="flex flex-col gap-2">
                              {/* Toggle Button */}
                              <button
                                onClick={() => toggleAction(item.agentId)}
                                className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 
                 rounded-lg transition-all duration-200 text-sm font-semibold text-gray-700 border border-gray-300"
                              >
                                {expandedRow === item.agentId ? (
                                  <>
                                    <span>Hide</span>
                                    <ChevronUp className="w-4 h-4" />
                                  </>
                                ) : (
                                  <>
                                    <span>Edit</span>
                                    <ChevronDown className="w-4 h-4" />
                                  </>
                                )}
                              </button>

                              {/* Collapsible Content */}
                              {expandedRow === item.agentId && (
                                <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    {/* Input Field */}
                                    <input
                                      type="number"
                                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="Enter amount"
                                      value={editValues[item.agentId] || ""}
                                      onChange={(e) =>
                                        handleInputChange(
                                          item.agentId,
                                          e.target.value
                                        )
                                      }
                                    />

                                    {/* UPDATE BUTTON (BIGGER SIZE) */}
                                    <button
                                      onClick={() =>
                                        updateAgentIncentive(
                                          item,
                                          editValues[item.agentId]
                                        )
                                      }
                                      className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
                                    >
                                      Update
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* DETAILS ROW */}
                        {/* {expandedRow === item.agentId && (
                          <tr>
                            <td colSpan={5} className="py-6 px-6 bg-gray-50 border-t border-gray-200">
                              <p className="text-sm text-gray-700 font-medium">
                                Date: {new Date(item.date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-700 font-medium">
                                Agent ID: {item.agentId}
                              </p>
                            </td>
                          </tr>
                        )} */}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {filteredData.map((item) => (
                  <div
                    key={item.agentId + item.incentiveId}
                    className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-teal-300 transition-all duration-200"
                  >
                    <div className="p-5 bg-white">
                      <h3 className="font-bold text-gray-800 text-base mb-4">
                        {item.purpose}
                      </h3>

                      <div className="space-y-3 text-sm text-gray-600 mb-5">
                        {/* Amount */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-teal-600" />
                            <span className="font-medium">Amount</span>
                          </span>
                          <span className="font-bold text-teal-700">
                            ₹{item.amount.toLocaleString()}
                          </span>
                        </div>

                        {/* Period */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Period</span>
                          </span>
                          <span className="font-semibold">
                            {new Date(0, item.month - 1).toLocaleString(
                              "default",
                              { month: "short" }
                            )}{" "}
                            {item.year}
                          </span>
                        </div>

                        {/* Agent */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Agent</span>
                          </span>
                          <span className="font-semibold">
                            {getText(item.agentName)}
                          </span>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleCard(item.agentId)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg transition-all duration-200 text-sm font-semibold text-gray-700 border border-gray-300"
                      >
                        {openCard === item.agentId ? (
                          <>
                            <span>Hide Details</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>View Details</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Details Card */}
                    {openCard === item.agentId && (
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-t-2 border-gray-200 p-5">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center text-sm">
                          <Users className="w-4 h-4 mr-2 text-teal-600" />
                          Agent Details
                        </h4>

                        <div className="text-sm text-gray-700">
                          <p>
                            <b>Name:</b> {getText(item.agentName)}
                          </p>
                          <p>
                            <b>Date:</b>{" "}
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                          <p>
                            <b>Agent ID:</b> {item.agentId}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-evenly mt-8 pt-10 border-t-2 border-gray-200">
              <button
                disabled={page === 1}
                className={`px-10 w-24 py-5 rounded-xl font-semibold transition-all duration-200 text-sm shadow-md ${page === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 hover:shadow-lg active:scale-[0.98]"
                  }`}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Previous
              </button>

              <span className="text-sm text-gray-600 font-medium">
                Page{" "}
                <span className="text-teal-600 font-bold text-base">
                  {page}
                </span>{" "}
                of{" "}
                <span className="text-gray-900 font-bold text-base">
                  {totalPages}
                </span>
              </span>

              <button
                disabled={page === totalPages}
                className={`px-6 py-3 w-16 rounded-xl font-semibold transition-all duration-200 text-sm shadow-md ${page === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 hover:shadow-lg active:scale-[0.98]"
                  }`}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #14b8a6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0d9488;
        }
      `}</style>
    </div>
  );
};

export default IncentivePage;
