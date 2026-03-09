// src/config/sidebarModules.js
import {
  FaStore,
  FaUsers,
  FaBoxes,
  FaShoppingCart,
  FaLayerGroup,
  FaReceipt,
  FaListAlt,
} from "react-icons/fa";

export const SIDEBAR_MODULES = [
  { id: "shops", label: "Shops", icon: FaStore },
  { id: "users", label: "Employees", icon: FaUsers },
  { id: "product", label: "Products", icon: FaBoxes },
  { id: "purchases", label: "Purchases", icon: FaShoppingCart },
  { id: "inventory", label: "Inventory", icon: FaLayerGroup },
  { id: "stock-transfer", label: "Stock Transfer", icon: FaLayerGroup },
  { id: "orders", label: "Orders", icon: FaLayerGroup },
  { id: "customer", label: "Customer", icon: FaUsers },
  { id: "vendors", label: "Vendors", icon: FaUsers },
  { id: "permissions", label: "Permission Management", icon: FaUsers },
  { id: "sales-create", label: "Sales Form", icon: FaReceipt },
  { id: "sales-list", label: "Sales List", icon: FaListAlt },
];
