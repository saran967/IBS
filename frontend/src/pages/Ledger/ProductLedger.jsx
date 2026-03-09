import React, { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import {
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";

import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import customFetch from "../../utils/customFetch.js";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8A2BE2",
  "#DC143C",
];

export default function AnalyticsDashboard() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const ITEMS_PER_PAGE = 5;

  // ================= FETCH LEDGER =================
  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await customFetch.get("/analytics/ledger");
      setLedger(data || []);
    } catch (err) {
      console.error("Ledger load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ================= PIE CHART (Purchase vs Sales) =================
  const pieData = useMemo(() => {
    let purchase = 0;
    let sales = 0;

    ledger.forEach((l) => {
      purchase += l.in || 0;
      sales += l.out || 0;
    });

    return [
      { name: "Purchase", value: purchase },
      { name: "Sales", value: sales },
    ];
  }, [ledger]);

  // ================= BAR CHART (Stock per Product) =================
  const inventoryData = useMemo(() => {
    const map = {};

    ledger.forEach((l) => {
      if (!map[l.product]) map[l.product] = 0;
      map[l.product] += (l.in || 0) - (l.out || 0);
    });

    return Object.entries(map).map(([name, stock]) => ({
      name,
      stock,
    }));
  }, [ledger]);

  const visibleInventory = inventoryData.slice(
    page * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );

  // ================= TOP MOVED PRODUCTS TABLE =================
  const topSelling = useMemo(() => {
    const map = {};

    ledger.forEach((l) => {
      if (!map[l.product]) map[l.product] = 0;
      map[l.product] += l.out || 0;
    });

    return Object.entries(map)
      .map(([product, qty]) => ({ product, quantity: qty }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [ledger]);

  // ================= PAGINATION =================
  const handlePrevPage = () => {
    setPage((p) => Math.max(p - 1, 0));
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(inventoryData.length / ITEMS_PER_PAGE) - 1;
    setPage((p) => Math.min(p + 1, maxPage));
  };

  // ================= UI =================
  return (
    <Box p={2}>
      <Typography variant="h5" mb={2} fontWeight={700} textAlign="center">
        Inventory & Sales Analytics
      </Typography>

      {/* TOP GRID */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 2,
        }}
      >
        {/* PIE CHART */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight={700} mb={1}>
            Purchase vs Sales
          </Typography>

          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        {/* TOP SELLING TABLE */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight={600} mb={1}>
            Top Sold Products
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: "#f5f5f5" }}>
                <TableCell>S.No</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Qty Sold</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {topSelling.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* BAR CHART */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>Stock Levels by Product</Typography>

          <Box>
            <IconButton onClick={handlePrevPage}>
              <ArrowBackIos fontSize="small" />
            </IconButton>

            <IconButton onClick={handleNextPage}>
              <ArrowForwardIos fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={visibleInventory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="stock" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
