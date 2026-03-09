import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Grid,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import getLocalizedText from "../../utils/getLocalizedText";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#d0ed57"];

const CustomerAnalytics = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  /* ---------------- FETCH ANALYTICS ---------------- */
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await customFetch.get("/customer-analytics/sales-summary");
      setData(res.data || {});
    } catch (err) {
      toast.error("Failed to fetch analytics");
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  /* ---------------- SAFE FALLBACKS ---------------- */
  const overall = data.overall || {
    totalGross: 0,
    totalPaid: 0,
    totalBalance: 0,
  };

  const topB2B = Array.isArray(data.topB2B) ? data.topB2B : [];
  const b2cTrend = Array.isArray(data.b2cTrend) ? data.b2cTrend : [];

  /* ---------------- NORMALIZE B2B NAMES ---------------- */
  const safeTopB2B = useMemo(() => {
    return topB2B.map((c) => {
      let normalizedName;

      if (typeof c.name === "string") {
        // ❗ Fix invalid backend data
        normalizedName = { en: c.name, ta: c.name };
      } else {
        normalizedName = c.name;
      }

      return {
        ...c,
        name: getLocalizedText(normalizedName),
        totalGross: Number(c.totalGross || 0),
      };
    });
  }, [topB2B]);

  /* ---------------- FORMAT MONTHLY TREND ---------------- */
  const monthNames = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formattedTrend = useMemo(
    () =>
      b2cTrend.map((t) => ({
        month: monthNames[t?._id] || "",
        totalGross: t?.totalGross || 0,
      })),
    [b2cTrend],
  );

  const exportExcel = () => {
    const hasData =
      Number(overall.totalGross || 0) > 0 ||
      safeTopB2B.length > 0 ||
      formattedTrend.length > 0;

    if (!hasData) {
      toast.warning("No customer ledger data to export");
      return;
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        {
          "Total Gross": Number(overall.totalGross || 0),
          "Total Paid": Number(overall.totalPaid || 0),
          "Total Balance": Number(overall.totalBalance || 0),
        },
      ]),
      "Summary",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        safeTopB2B.map((row, index) => ({
          "S.No": index + 1,
          Customer: row.name || "-",
          Gross: Number(row.totalGross || 0),
        })),
      ),
      "Top B2B",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        formattedTrend.map((row) => ({
          Month: row.month,
          Gross: Number(row.totalGross || 0),
        })),
      ),
      "Monthly B2C",
    );

    XLSX.writeFile(workbook, "Customer_Ledger.xlsx");
  };

  const exportPDF = () => {
    const hasData =
      Number(overall.totalGross || 0) > 0 ||
      safeTopB2B.length > 0 ||
      formattedTrend.length > 0;

    if (!hasData) {
      toast.warning("No customer ledger data to export");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Customer Ledger Analytics", 14, 14);

    autoTable(doc, {
      startY: 20,
      head: [["Total Gross", "Total Paid", "Total Balance"]],
      body: [
        [
          Number(overall.totalGross || 0),
          Number(overall.totalPaid || 0),
          Number(overall.totalBalance || 0),
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    const topB2BStartY = (doc.lastAutoTable?.finalY || 20) + 8;
    autoTable(doc, {
      startY: topB2BStartY,
      head: [["S.No", "Customer", "Gross"]],
      body: safeTopB2B.map((row, index) => [
        index + 1,
        row.name || "-",
        Number(row.totalGross || 0),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    const trendStartY = (doc.lastAutoTable?.finalY || topB2BStartY) + 8;
    autoTable(doc, {
      startY: trendStartY,
      head: [["Month", "Gross"]],
      body: formattedTrend.map((row) => [row.month, Number(row.totalGross || 0)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save("Customer_Ledger.pdf");
  };

  /* ---------------- LOADING / EMPTY ---------------- */
  if (loading)
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CircularProgress size={60} />
      </Box>
    );

  if (!data)
    return (
      <Typography textAlign="center" sx={{ py: 4 }}>
        No analytics data available
      </Typography>
    );

  /* ---------------- UI ---------------- */
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        fontWeight="bold"
        color="primary"
        sx={{ mb: 3, textAlign: "center", fontSize: isMobile ? 16 : 18 }}
      >
        📊 Customer Analytics Dashboard
      </Typography>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Button variant="outlined" onClick={exportExcel}>
          Export Excel
        </Button>
        <Button variant="outlined" color="error" onClick={exportPDF}>
          Export PDF
        </Button>
      </Box>

      <Grid
        container
        spacing={0}
        sx={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
        }}
      >
        {/* ---------- Overall Sales Summary ---------- */}
        <Grid
          item
          xs={12}
          md={6}
          lg={6}
          sx={{
            minWidth: { xs: "100%", md: "50%" },
            maxWidth: { xs: "100%", md: "50%" },
          }}
        >
          <Card sx={{ borderRadius: 3, width: "100%" }}>
            <CardContent>
              <Typography
                fontWeight={600}
                mb={2}
                variant="body1"
                sx={{ textAlign: "center" }}
              >
                Overall Sales Summary
              </Typography>

              <Box
                sx={{
                  width: "100%",
                  height: isMobile ? 260 : 350,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Totals",
                        Gross: overall.totalGross,
                        Paid: overall.totalPaid,
                        Balance: overall.totalBalance,
                      },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Gross" fill="#82ca9d" />
                    <Bar dataKey="Paid" fill="#8884d8" />
                    <Bar dataKey="Balance" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ---------- Top B2B Pie Chart ---------- */}
        <Grid
          item
          xs={12}
          md={6}
          lg={6}
          sx={{
            minWidth: { xs: "100%", md: "50%" },
            maxWidth: { xs: "100%", md: "50%" },
          }}
        >
          <Card sx={{ borderRadius: 3, width: "100%" }}>
            <CardContent>
              <Typography
                fontWeight={600}
                mb={2}
                variant="body1"
                sx={{ textAlign: "center" }}
              >
                Top 5 B2B Customers
              </Typography>

              <Box
                sx={{
                  width: "100%",
                  height: isMobile ? 260 : 350,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={safeTopB2B}
                      dataKey="totalGross"
                      nameKey="name"
                      outerRadius={isMobile ? 80 : 120}
                      label
                    >
                      {safeTopB2B.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---------- MONTHLY B2C TREND ---------- */}
      <Box mt={3}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly B2C Sales Trend
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalGross"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CustomerAnalytics;
