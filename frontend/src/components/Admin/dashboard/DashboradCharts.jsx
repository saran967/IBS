import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  useTheme,
  Grid,
  useMediaQuery,
} from "@mui/material";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------
   FORMAT HELPERS
------------------------------ */

// Format YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
};

// Get week key (YYYY-Wxx)
const getWeek = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d)) return "";

  const first = new Date(d.getFullYear(), 0, 1);
  const diff = Math.round(((d - first) / 86400000 + first.getDay()) / 7);
  return `${d.getFullYear()}-W${String(diff).padStart(2, "0")}`;
};

// Reduce array -> key groups
const groupBy = (data, keyFn) => {
  const map = {};
  data.forEach((d) => {
    const key = keyFn(d.date);
    map[key] = (map[key] || 0) + Number(d.amount || 0);
  });

  return Object.keys(map).map((k) => ({
    name: k,
    total: map[k],
  }));
};

/* ---------------------------------
   MAIN COMPONENT
---------------------------------- */

export default function DashboardCharts({
  latestSales = [],
  latestPurchases = [],
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // ⬅ MOBILE CHECK
  const [mode, setMode] = useState("daily");

  /* ------------------------------
     NORMALIZE RAW LEDGER DATA
  ------------------------------ */

  const sales = useMemo(
    () =>
      (latestSales || [])
        .map((s) => ({
          date: formatDate(s.saleDate || s.date || s.createdAt),
          amount: Number(s.billAmount || s.netTotal || 0),
        }))
        .filter((s) => s.date), // ✅ REMOVE BAD DATES
    [latestSales],
  );

  const purchases = useMemo(
    () =>
      (latestPurchases || [])
        .map((p) => ({
          date: formatDate(p.date || p.createdAt),
          amount: Number(p.billAmount || p.totalAmount || 0),
        }))
        .filter((p) => p.date), // ✅ REMOVE BAD DATES
    [latestPurchases],
  );

  /* ------------------------------
     MODE SWITCHER
  ------------------------------ */

  const processMode = (arr) => {
    if (mode === "daily") return groupBy(arr, (d) => d);
    if (mode === "weekly") return groupBy(arr, (d) => getWeek(d));
    return groupBy(arr, (d) => d.slice(0, 7)); // month
  };

  const salesDataFull = processMode(sales);
  const purchaseDataFull = processMode(purchases);

  /* ------------------------------
     MERGE FOR DUAL CHART
  ------------------------------ */

  const mergedFull = useMemo(() => {
    const map = {};

    salesDataFull.forEach((d) => {
      map[d.name] = { name: d.name, sales: d.total, purchases: 0 };
    });
    purchaseDataFull.forEach((d) => {
      if (!map[d.name]) map[d.name] = { name: d.name, sales: 0, purchases: 0 };
      map[d.name].purchases = d.total;
    });

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [salesDataFull, purchaseDataFull]);

  /* ------------------------------------
     MOBILE: SHOW ONLY LAST 4 ENTRIES
  ------------------------------------ */

  const merged = isMobile ? mergedFull.slice(-4) : mergedFull;
  const salesData = isMobile ? salesDataFull.slice(-4) : salesDataFull;

  /* ------------------------------
     TOOLTIP
  ------------------------------ */

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <Paper sx={{ p: 1.3 }}>
        <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
        {payload.map((p, i) => (
          <Typography key={i} sx={{ color: p.color, fontSize: "0.85rem" }}>
            {p.name}: ₹{p.value.toLocaleString()}
          </Typography>
        ))}
      </Paper>
    );
  };

  /* ------------------------------
     RENDER
  ------------------------------ */

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Grid container spacing={3} sx={{ width: "100%" }}>
        {/* LEFT CHART - SALES VS PURCHASES */}
        <Grid
          item
          xs={12}
          md={12}
          lg={6}
          sx={{ width: "100%", display: "flex" }}
        >
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              width: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Sales vs Purchases
            </Typography>

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, v) => v && setMode(v)}
              sx={{
                mb: 2,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap", // ← Makes it responsive
                "& .MuiToggleButton-root": {
                  flex: { xs: "1 1 30%", sm: "0" }, // ← Buttons auto-resize in mobile
                  m: 0.5,
                  fontSize: { xs: "0.75rem", sm: "0.9rem" }, // ← Smaller text on mobile
                  padding: { xs: "4px 6px", sm: "6px 12px" },
                },
              }}
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ height: { xs: 260, sm: 300, md: 320 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={merged}>
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="rgba(59,130,246,0.45)" />
                      <stop offset="95%" stopColor="rgba(59,130,246,0.05)" />
                    </linearGradient>

                    <linearGradient
                      id="purchaseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="rgba(16,185,129,0.45)" />
                      <stop offset="95%" stopColor="rgba(16,185,129,0.05)" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    dot={{
                      r: 5,
                      fill: "#fff",
                      stroke: "#3B82F6",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="purchases"
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="url(#purchaseGradient)"
                    dot={{
                      r: 5,
                      fill: "#fff",
                      stroke: "#10B981",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT CHART - SALES TREND */}
        <Grid
          item
          xs={12}
          md={12}
          lg={6}
          sx={{ width: "100%", display: "flex" }}
        >
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              width: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Sales Trend
            </Typography>

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, v) => v && setMode(v)}
              sx={{
                mb: 2,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap", // ← enables full responsiveness
                gap: 1, // spacing between buttons

                "& .MuiToggleButton-root": {
                  flex: { xs: "1 1 30%", sm: "0 0 auto" }, // ← 3 buttons per row on mobile
                  fontSize: { xs: "0.75rem", sm: "0.9rem" },
                  padding: { xs: "4px 6px", sm: "6px 12px" },
                },
              }}
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ height: { xs: 260, sm: 300, md: 320 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient
                      id="salesGradient2"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="rgba(59,130,246,0.45)" />
                      <stop offset="95%" stopColor="rgba(59,130,246,0.05)" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#salesGradient2)"
                    dot={{
                      r: 5,
                      fill: "#fff",
                      stroke: "#3B82F6",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
