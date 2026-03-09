import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Grid,
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
