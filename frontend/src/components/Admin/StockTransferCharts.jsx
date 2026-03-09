import React, { useMemo } from "react";
  import { Box, Paper, Typography, Grid, useTheme, useMediaQuery } from "@mui/material";
  import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
  } from "recharts";

  export default function StockTransferCharts({ transfers }) {
    const theme = useTheme();
    const isSmallMobile = useMediaQuery("(max-width:320px)");
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Group by product
    const productData = useMemo(() => {
      const map = {};
      transfers.forEach((t) => {
        const pName = t.productId?.name?.en || t.productId?.name || "Unknown";
        map[pName] = (map[pName] || 0) + t.quantity;
      });
      return Object.entries(map).map(([name, quantity]) => ({ name, quantity }));
    }, [transfers]);

    // Group by date
    const dateData = useMemo(() => {
      const map = {};
      transfers.forEach((t) => {
        const date = new Date(t.transferDate).toLocaleDateString("en-IN");
        map[date] = (map[date] || 0) + t.quantity;
      });
      return Object.entries(map).map(([date, quantity]) => ({ date, quantity }));
    }, [transfers]);

    // Group by shop
    const shopData = useMemo(() => {
      const map = {};
      transfers.forEach((t) => {
        const sName = t.toShopId?.name?.en || t.toShopId?.name || "Shop";
        map[sName] = (map[sName] || 0) + t.quantity;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [transfers]);

    const COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

    const cardStyle = {
      p: isSmallMobile ? 1.5 : 3,
      height: isSmallMobile ? 250 : isMobile ? 300 : 380,
      borderRadius: 3,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
      transition: "0.2s",
      "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.18)" },
    };

    return (
      <Box sx={{ mt: 4, px: isSmallMobile ? 1 : 2 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          mb={3}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: isSmallMobile ? "1rem" : { xs: "1.1rem", sm: "1.25rem" },
          }}
        >
          📊 Stock Transfer Insights
        </Typography>

        <Grid container spacing={isSmallMobile ? 1 : 4} sx={{ flexWrap: "wrap" }}>
          {/* ---------------- LINE CHART ---------------- */}
         <Grid item xs={12} md={6} lg={6} xl={6}className="w-130">

            <Paper sx={cardStyle}>
              <Typography
                fontWeight={600}
                mb={2}
                fontSize={isSmallMobile ? 12 : { xs: 14, lg: 15 }}
                sx={{width:350}}
              >
                Transfers Over Time
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dateData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: isSmallMobile ? 9 : 12 }}
                    />
                    <YAxis tick={{ fontSize: isSmallMobile ? 9 : 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="quantity"
                      stroke="#06B6D4"
                      strokeWidth={isSmallMobile ? 2 : 3}
                      dot={{ r: isSmallMobile ? 3 : 5, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* ---------------- PIE CHART ---------------- */}
         <Grid item xs={12} md={6} lg={6} xl={6} className="w-130">

            <Paper sx={cardStyle}>
              <Typography
                fontWeight={600}
                mb={2}
                fontSize={isSmallMobile ? 12 : { xs: 14, sm: 15 }}
                sx={{width:350}}
              >
              
                Transfers by Shop (To Shop)
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart cl>
                    <Pie
                      data={shopData}
                      cx="50%"
                      cy="50%"
                      dataKey="value"
                      nameKey="name"
                      outerRadius={isSmallMobile ? 60 : isMobile ? 90 : 120}
                      label={{ fontSize: isSmallMobile ? 9 : 13 }}
                    >
                      {shopData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={COLORS[idx % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      height={40}
                      wrapperStyle={{ fontSize: isSmallMobile ? 10 : 12 }}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

        
          
        </Grid>
        <br />
              {/* ---------------- BAR CHART ---------------- */}
        <Grid item xs={12}>
            <Paper sx={cardStyle}>
              <Typography
                fontWeight={600}
                mb={2}
                fontSize={isSmallMobile ? 12 : { xs: 14, sm: 16 }}
              >
                Transfers by Product
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: isSmallMobile ? 9 : 12 }}
                    />
                    <YAxis tick={{ fontSize: isSmallMobile ? 9 : 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="quantity"
                      radius={[6, 6, 0, 0]}
                      fill="#4F46E5"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
      </Box>
    );
  }