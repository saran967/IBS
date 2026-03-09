// export default function MultiSales() {
//   const [tabs, setTabs] = useState([
//     { id: crypto.randomUUID(), label: "Sale 1", data: {} }
//   ]);

//   const [activeTabId, setActiveTabId] = useState(tabs[0].id);

//   const addNewTab = () => {
//     const newTab = {
//       id: crypto.randomUUID(),
//       label: `Sale ${tabs.length + 1}`,
//       data: {}
//     };
//     setTabs([...tabs, newTab]);
//     setActiveTabId(newTab.id);
//   };

//   const removeTab = (id) => {
//     if (tabs.length === 1) return; // prevent empty
//     const remaining = tabs.filter(t => t.id !== id);
//     setTabs(remaining);
//     setActiveTabId(remaining[0].id);
//   };

//   const updateTabData = (id, updatedData) => {
//     setTabs(prev =>
//       prev.map(t =>
//         t.id === id
//           ? { ...t, data: { ...t.data, ...updatedData } }
//           : t
//       )
//     );
//   };

//   const activeTab = tabs.find(t => t.id === activeTabId);

//   return (
//     <Box>
//       {/* Tabs Header */}
//       <Stack direction="row" spacing={1}>
//         {tabs.map(t => (
//           <Chip
//             key={t.id}
//             label={t.label}
//             onClick={() => setActiveTabId(t.id)}
//             onDelete={() => removeTab(t.id)}
//             color={t.id === activeTabId ? "primary" : "default"}
//           />
//         ))}
//         <Button variant="outlined" onClick={addNewTab}>
//           + New
//         </Button>
//       </Stack>

//       <Box mt={2}>
//         <SaleCreate
//           tabId={activeTabId}
//           tabData={activeTab.data}
//           updateTabData={updateTabData}
//         />
//       </Box>
//     </Box>
//   );
// }

import React, { useState } from "react";
import { Box, Button, Chip, Stack } from "@mui/material";
import SaleCreate from "./SaleCreate/SalesCreate";

const defaultSaleTabData = {
  items: [
    {
      shopId: "",
      productCode: "",
      productId: "",
      name: "",
      hsnCode: "",
      qty: 0,
      unit: "",
      sellingPrice: 0,
      cgstPercentage: 0,
      sgstPercentage: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      rate: 0,
      total: 0,
    },
  ],
  totals: {
    gross: 0,
    discount: "",
    net: 0,
    paid: "",
    balance: 0,
  },
  selectedCustomer: "",
  selectedShop: "",
  saleType: "B2C",
  billType: "GST",
  includeTransport: false,
  includeHandling: false,
  handlingCharges: [],
  transport: {
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    transportAgency: "",
    remarks: "",
  },
  savedSaleId: null,
  companyQtyMap: {},
};

export default function MultiSales() {
  const [tabs, setTabs] = useState([
    {
      id: crypto.randomUUID(),
      label: "Sale 1",
      data: JSON.parse(JSON.stringify(defaultSaleTabData)),
    },
  ]);

  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const addNewTab = () => {
    const newTab = {
      id: crypto.randomUUID(),
      label: `Sale ${tabs.length + 1}`,
      data: JSON.parse(JSON.stringify(defaultSaleTabData)),
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const removeTab = (id) => {
    if (tabs.length === 1) return;
    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);
    setActiveTabId(filtered[0].id);
  };

  const updateTabData = (tabId, updated) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, data: { ...t.data, ...updated } } : t,
      ),
    );
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <Box p={2} sx={{ width: "100%", position: "relative", pb: 10 }}>
      {/*  SaleCreate */}
      <Box mt={2}>
        <SaleCreate
          tabId={activeTabId}
          tabData={activeTab.data}
          updateTabData={updateTabData}
        />
      </Box>

      {/*  Bottom Center Tabs */}
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1200,
          background: "#fff",
          border: "1px solid #ddd",
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          borderRadius: 3,
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          maxWidth: "95vw",
          overflowX: "auto",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {tabs.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              onClick={() => setActiveTabId(t.id)}
              onDelete={() => removeTab(t.id)}
              color={activeTabId === t.id ? "primary" : "default"}
              sx={{
                fontWeight: activeTabId === t.id ? "bold" : "normal",
              }}
            />
          ))}

          <Button
            variant="outlined"
            onClick={addNewTab}
            sx={{ whiteSpace: "nowrap" }}
          >
            + New Sale Tab
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
