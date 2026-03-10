import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Paper,
} from "@mui/material";

import customFetch from "../utils/customFetch";

import DashboardKPI from "../components/Admin/dashboard/DashboradKPI.";
import DashboardCharts from "../components/Admin/dashboard/DashboradCharts";
import DashboardTables from "../components/Admin/dashboard/DashboradTables";
import DashboardProducts from "../components/Admin/dashboard/DashboradProducts.";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3B82F6" },
    background: { default: "#F9FAFB", paper: "#FFFFFF" },
  },
});

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [latestSales, setLatestSales] = useState([]);
  const [latestPurchases, setLatestPurchases] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [chartData, setChartData] = useState({ sales: [], purchases: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await customFetch.get("/dashboard/summary");

        setSummary(data);
        setLatestSales(data.recentSales ?? data.latestSales ?? []);
        setLatestPurchases(
          (data.recentPurchases || data.latestPurchases || []).map((p) => ({
            ...p,
            date: p.purchaseDate || p.createdAt,
            vendor: p.vendor || p.vendorId,
          })),
        );

        setTransfers(
          Array.isArray(data.recentTransfers)
            ? data.recentTransfers
            : data.recentTransfers?.transfers || [],
        );
        setLowStockItems(data.lowStockItems ?? []);

        // Pass 30 day history to charts instead of just the latest 5-10 items
        const salesForChart = data.sales30Days || [];
        const purchasesForChart = (data.purchases30Days || []).map(p => ({
          ...p,
          amount: p.totalAmount || 0,
          date: p.purchaseDate || p.createdAt
        }));

        setChartData({
          sales: salesForChart,
          purchases: purchasesForChart
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Dashboard Overview
        </Typography>

        {/* KPI */}
        <Box sx={{ mb: 3 }}>
          <DashboardKPI summary={summary} />
        </Box>

        {/* CHARTS */}
        <Box
          sx={{
            borderRadius: 3,
            mb: 3,
          }}
        >
          <DashboardCharts
            latestSales={chartData.sales}
            latestPurchases={chartData.purchases}
          />
        </Box>

        {/* TABLES */}
        <Box sx={{ mb: 3 }}>
          <DashboardTables
            latestSales={latestSales}
            latestPurchases={latestPurchases}
            stockTransfers={transfers}
          />
        </Box>

        {/* LOW STOCK PRODUCTS DASHBOARD */}
        <Box sx={{ p: 2, mb: 3 }}>
          <DashboardProducts products={lowStockItems} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
