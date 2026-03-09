import { createBrowserRouter, Navigate } from "react-router-dom";
import PublicRoutes from "./PublicRoutes";
import ProtectedRoutes from "./ProtectRoutes";
import {
  AuthLayout,
  Dashboard,
  DashBoardOulet,
  Error,
  Login,
  ProductList,
  UserManagement,
  FinancialYearManagement,
} from "../pages";
import AdminControl from "../components/Admin/AdminControl";
import PurchaseList from "../pages/PurchaseList";
import ProductPackList from "../pages/ProductPackList";
import InventoryList from "../pages/Admin/InventoryList";
import ShopList from "../pages/ShopList";
import CustomerList from "../pages/CustomerList";
import SalesCreate from "../pages/sales/SaleCreate/SalesCreate";
import SalesList from "../pages/sales/SalesList";
import SalesDetails from "../components/Admin/SalesDetails";
import TokenPrint from "../pages/sales/TokenPrint";
import StockTransferPage from "../pages/StockTransferList";
import OrderManagement from "../pages/OrderList";
import VendorManagement from "../pages/VendorManagement";
import PermissionManagement from "../pages/PermissionManagement";
import { useAuth } from "../context/AuthContext";
import CustomerLedger from "../components/Admin/CustomerLedger";
import PermissionPage from "../pages/PermissionPage";
import DeliveryBill from "../pages/sales/DeliveryBill";
import SalesBill from "../pages/sales/SalesBill";
import ProductPriceHistory from "../pages/ProductPriceHistory";
import AllPriceHistory from "../pages/AllPriceHistory";
import VendorLedger from "../pages/Ledger/VendorLedger";
import VendorPayment from "../pages/VendorPayment";
import StockTransferLedger from "../pages/Ledger/StockTransferLedger";
import PurchaseLedger from "../pages/Ledger/PurchaseLedger";
import SalesLedger from "../pages/Ledger/SalesLedger";
import ProductLedger from "../pages/Ledger/ProductLedger";
import CreateTokenFromSale from "../pages/sales/CreateTokenFromSale";
import InvoiceA4Styled from "../pages/sales/GstBill";
import VendorLedgertable from "../pages/Ledger/VendorLedgertable";
import CustomerAnalytics from "../pages/Ledger/CustomerAnalytics";
import MultiSales from "../pages/sales/MultiSales";
import LowStockReport from "../pages/LowStockReport";

import AndroidProductListPage from "../pages/Android/AndroidProductListPage";
import AndroidOrderlistPage from "../pages/Android/AndroidOrderlistPage";
import MobileOrderPage from "../pages/Android/MobileOrderPage";
import CreateAgent_Android from "../pages/Android/CreateAgent_Android";
import TrackedRoutes from "../pages/Android/TrackedRoutes";
import AndroidOfferPage from "../pages/Android/AndroidOfferPage";
import IncentivePage from "../pages/Android/IncentivePage";

//* Permission Wrapper for routes
const PermissionRoute = ({ element, moduleId }) => {
  const { hasPermission, user, loading } = useAuth();

  if (loading) return null; // Or show loader

  // Admins bypass restriction
  if (user?.role === "admin" || hasPermission(moduleId)) {
    return element;
  }

  // Redirect to dashboard if no permission
  return <Navigate to={`/${user?.lang || "en"}/admin`} replace />;
};

const router = createBrowserRouter([
  // Redirect root
  {
    path: "/",
    element: <Navigate to="/en/auth/login" replace />,
  },

  // Public Auth
  {
    path: "/:lang",
    element: <AuthLayout />,
    children: [
      { path: "auth/login", element: <PublicRoutes element={<Login />} /> },
    ],
  },

  //* Admin Section
  {
    path: "/:lang/admin",
    element: <ProtectedRoutes element={<DashBoardOulet />} />,
    errorElement: <Error />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "product",
        element: (
          <PermissionRoute moduleId="product" element={<ProductList />} />
        ),
      },
      {
        path: "shops",
        element: <PermissionRoute moduleId="shops" element={<ShopList />} />,
      },
      {
        path: "users",
        element: (
          <PermissionRoute moduleId="users" element={<AdminControl />} />
        ),
      },
      {
        path: "purchases",
        element: (
          <PermissionRoute moduleId="purchases" element={<PurchaseList />} />
        ),
      },
      {
        path: "product-packs",
        element: (
          <PermissionRoute
            moduleId="product-packs"
            element={<ProductPackList />}
          />
        ),
      },
      {
        path: "financial-year",
        element: (
          <PermissionRoute
            moduleId="admin-settings"
            element={<FinancialYearManagement />}
          />
        ),
      },
      {
        path: "inventory",
        element: (
          <PermissionRoute moduleId="inventory" element={<InventoryList />} />
        ),
      },
      {
        path: "low-stock-report",
        element: (
          <PermissionRoute
            moduleId="low-stock-report"
            element={<LowStockReport />}
          />
        ),
      },
      {
        path: "customer",
        element: (
          <PermissionRoute moduleId="customer" element={<CustomerList />} />
        ),
      },
      {
        path: "customer/:id/ledger",
        element: (
          <PermissionRoute
            moduleId="customer-ledger"
            element={<CustomerLedger />}
          />
        ),
      },
      {
        path: "stock-transfer",
        element: (
          <PermissionRoute
            moduleId="stock-transfer"
            element={<StockTransferPage />}
          />
        ),
      },
      {
        path: "sales/create",
        element: (
          <PermissionRoute moduleId="sales-create" element={<MultiSales />} />
        ),
      },
      {
        path: "sales/create/:id",
        element: (
          <PermissionRoute moduleId="sales-create" element={<MultiSales />} />
        ),
      },
      {
        path: "sales/list",
        element: (
          <PermissionRoute moduleId="sales-list" element={<SalesList />} />
        ),
      },
      {
        path: "sales/:id/gstbill",
        element: (
          <PermissionRoute
            moduleId="sales-list"
            element={<InvoiceA4Styled />}
          />
        ),
      },
      {
        path: "sales/:id",
        element: (
          <PermissionRoute moduleId="sales-list" element={<SalesDetails />} />
        ),
      },
      {
        path: "sales/:id/bill",
        element: (
          <PermissionRoute moduleId="sales-list" element={<SalesBill />} />
        ),
      },
      {
        path: "sales/:id/print",
        element: (
          <PermissionRoute moduleId="sales-list" element={<DeliveryBill />} />
        ),
      },
      {
        path: "sales/edit/:id",
        element: (
          <PermissionRoute moduleId="sales-create" element={<SalesCreate />} />
        ),
      },
      {
        path: "orders",
        element: (
          <PermissionRoute moduleId="orders" element={<OrderManagement />} />
        ),
      },
      {
        path: "vendors",
        element: (
          <PermissionRoute moduleId="vendors" element={<VendorManagement />} />
        ),
      },
      {
        path: "vendors-ledger",
        element: (
          <PermissionRoute moduleId="vendors" element={<VendorLedgertable />} />
        ),
      },
      {
        path: "vendorsledger",
        element: (
          <PermissionRoute moduleId="vendors" element={<VendorLedger />} />
        ),
      },
      {
        path: "vendor-repayment",
        element: (
          <PermissionRoute moduleId="vendors" element={<VendorPayment />} />
        ),
      },

      {
        path: "product/:id/price-history",
        element: (
          <PermissionRoute
            moduleId="product"
            element={<ProductPriceHistory />}
          />
        ),
      },
      {
        path: "product/price-history/all",
        element: (
          <PermissionRoute moduleId="product" element={<AllPriceHistory />} />
        ),
      },

      {
        path: "permissions",
        element: (
          <PermissionRoute
            moduleId="permissions"
            element={<PermissionPage />}
          />
        ),
      },
      {
        path: "ledger/product",
        element: (
          <PermissionRoute
            moduleId="ledger-product"
            element={<ProductLedger />}
          />
        ),
      },
      {
        path: "ledger/sales",
        element: (
          <PermissionRoute moduleId="ledger-sales" element={<SalesLedger />} />
        ),
      },
      {
        path: "ledger/purchase",
        element: (
          <PermissionRoute
            moduleId="ledger-purchase"
            element={<PurchaseLedger />}
          />
        ),
      },
      {
        path: "ledger/customer",
        element: (
          <PermissionRoute
            moduleId="ledger-customer"
            element={<CustomerAnalytics />}
          />
        ),
      },

      {
        path: "ledger/stock-transfer",
        element: (
          <PermissionRoute
            moduleId="ledger-stock-transfer"
            element={<StockTransferLedger />}
          />
        ),
      },

      {
        path: "android/listpage",
        element: (
          <PermissionRoute
            moduleId="android"
            element={<AndroidProductListPage />}
          />
        ),
      },

      {
        path: "android/orderpage",
        element: (
          <PermissionRoute
            moduleId="android"
            element={<AndroidOrderlistPage />}
          />
        ),
      },

      {
        path: "android/mobileorderpage",
        element: (
          <PermissionRoute moduleId="android" element={<MobileOrderPage />} />
        ),
      },

      {
        path: "android/mobileofferpage",
        element: (
          <PermissionRoute moduleId="android" element={<AndroidOfferPage />} />
        ),
      },

      {
        path: "android/createagent_android",
        element: (
          <PermissionRoute
            moduleId="android"
            element={<CreateAgent_Android />}
          />
        ),
      },
      {
        path: "android/track_android/:id",
        element: (
          <PermissionRoute moduleId="android" element={<TrackedRoutes />} />
        ),
      },

      {
        path: "android/incentive",
        element: (
          <PermissionRoute moduleId="android" element={<IncentivePage />} />
        ),
      },

      { path: "token/:tokenNumber/print", element: <TokenPrint /> },
      // {
      //   path: "sales/:id/create-token",
      //   element: (
      //     <PermissionRoute
      //       moduleId="sales-list"
      //       element={<CreateTokenFromSale />}
      //     />
      //   ),
      // },
    ],
  },

  // Superadmin (future)
  {
    path: "/:lang/superadmin",
    element: <ProtectedRoutes element={<DashBoardOulet />} />,
    errorElement: <Error />,
    children: [{ index: true, element: <Dashboard /> }],
  },

  // Subadmin (example)
  {
    path: "/:lang/subadmin",
    element: <ProtectedRoutes element={<DashBoardOulet />} />,
    errorElement: <Error />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "users", element: <UserManagement /> },
    ],
  },

  // 404 fallback
  { path: "*", element: <Error /> },
]);

export default router;
