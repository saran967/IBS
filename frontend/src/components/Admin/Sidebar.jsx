import { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Divider,
  Box,
  Typography,
  Avatar,
  Tooltip,
  Collapse,
  CircularProgress,
  alpha,
  useMediaQuery,
  Backdrop,
} from "@mui/material";
import {
  MdStore,
  MdPeople,
  MdInventory2,
  MdShoppingCart,
  MdLayers,
  MdMenu,
  MdLogout,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdReceipt,
  MdListAlt,
  MdLocalShipping,
  MdAssignment,
  MdPerson,
  MdGroup,
  MdSecurity,
  MdClose,
} from "react-icons/md";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const drawerWidth = 260;
export const collapsedWidth = 72;

export default function Sidebar({ open, setOpen }) {
  const [salesOpen, setSalesOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const toggleLedger = () => setLedgerOpen(!ledgerOpen);

  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission, logout, loading } = useAuth();
  const userLang = lang || "en";

  useEffect(() => {
    //  whenever route changes, collapse sidebar
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(false);
    }
  }, [isMobile]);

  const menuItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      path: `/${userLang}/admin`,
      icon: <MdStore />,
    },
    {
      id: "shops",
      name: "Shops",
      path: `/${userLang}/admin/shops`,
      icon: <MdStore />,
    },
    {
      id: "users",
      name: "Employees",
      path: `/${userLang}/admin/users`,
      icon: <MdPeople />,
    },
    {
      id: "product",
      name: "Products",
      path: `/${userLang}/admin/product`,
      icon: <MdInventory2 />,
    },
    {
      id: "purchases",
      name: "Purchases",
      path: `/${userLang}/admin/purchases`,
      icon: <MdShoppingCart />,
    },
    {
      id: "inventory",
      name: "Inventory",
      path: `/${userLang}/admin/inventory`,
      icon: <MdLayers />,
    },
    {
      id: "free-inventory",
      name: "Free Item Inventory",
      path: `/${userLang}/admin/free-inventory`,
      icon: <MdLayers />,
    },
    {
      id: "low-stock-report",
      name: "Low Stock Report",
      path: `/${userLang}/admin/low-stock-report`,
      icon: <MdAssignment />,
    },
    {
      id: "stock-transfer",
      name: "Stock Transfer",
      path: `/${userLang}/admin/stock-transfer`,
      icon: <MdLocalShipping />,
    },
    {
      id: "orders",
      name: "Orders",
      path: `/${userLang}/admin/orders`,
      icon: <MdAssignment />,
    },
    {
      id: "customer",
      name: "Customers",
      path: `/${userLang}/admin/customer`,
      icon: <MdPerson />,
    },
    {
      id: "vendors",
      name: "Vendors",
      path: `/${userLang}/admin/vendors`,
      icon: <MdGroup />,
    },
    {
      id: "product-packs",
      name: "Production History",
      path: `/${userLang}/admin/product-packs`,
      icon: <MdListAlt />,
    },
    {
      id: "admin-settings",
      name: "Financial Year",
      path: `/${userLang}/admin/financial-year`,
      icon: <MdLayers />,
    },
    {
      id: "permissions",
      name: "Permission Management",
      path: `/${userLang}/admin/permissions`,
      icon: <MdSecurity />,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(`/${userLang}/auth/login`, { replace: true });
  };

  const toggleDrawer = () => setOpen(!open);
  const toggleSales = () => setSalesOpen(!salesOpen);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  if (!user) return null;

  return (
    <>
      {/* Mobile menu button - fixed position for better accessibility */}
      {isMobile && (
        <IconButton
          onClick={toggleDrawer}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 1201,
            backgroundColor: "#1976D2",
            color: "white",
            "&:hover": {
              backgroundColor: "#1565C0",
            },
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <MdMenu size={24} />
        </IconButton>
      )}

      {/* Backdrop for mobile when sidebar is open */}
      {isMobile && open && (
        <Backdrop
          open={open}
          onClick={() => setOpen(false)}
          sx={{
            zIndex: 1100,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        />
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : collapsedWidth,
            background: "#0B1736",
            color: "#FFFFFF",
            borderRight: "none",
            boxSizing: "border-box",
            boxShadow: isMobile
              ? "4px 0 20px rgba(0,0,0,0.15)"
              : "2px 0 10px rgba(0,0,0,0.06)",
            transition: "width 0.3s ease, transform 0.3s ease",
            overflowX: "hidden",
            zIndex: isMobile ? 1200 : 1100,
            ...(isMobile && {
              position: "fixed",
              height: "100vh",
              top: 0,
              left: 0,
              transform: open
                ? "translateX(0)"
                : `translateX(-${drawerWidth}px)`,
            }),
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            px: open ? 2 : 1,
            py: 2,
            minHeight: 64,
          }}
        >
          {open && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "#1976D2" }}>
                <MdStore size={22} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#FFF" }}>
                ISB
              </Typography>
            </Box>
          )}

          {/* Updated menu button with different icons for open/close states */}
          <Tooltip sx={{ color: "#FFF" }} title={open ? "Collapse" : "Expand"}>
            <IconButton onClick={toggleDrawer}>
              {open ? <MdClose size={24} /> : <MdMenu size={24} />}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        <List sx={{ px: 1, py: 2, flex: 1 }}>
          {menuItems.map(
            (item) =>
              hasPermission(item.id) && (
                <Tooltip
                  key={item.id}
                  title={!open ? item.name : ""}
                  placement="right"
                >
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    onClick={isMobile ? () => setOpen(false) : undefined}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.8,
                      py: 1.2,
                      bgcolor:
                        location.pathname === item.path
                          ? "rgba(79,195,247,0.18)"
                          : "transparent",
                      "&:hover": { backgroundColor: "#14224A" },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        width: "4px",
                        height: "100%",
                        borderRadius: "0 4px 4px 0",
                        backgroundColor:
                          location.pathname === item.path
                            ? "#4FC3F7"
                            : "transparent",
                        transition: "0.2s",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color:
                          location.pathname === item.path
                            ? "#4FC3F7"
                            : "#C9D6F2",
                        minWidth: open ? 40 : "auto",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && <ListItemText primary={item.name} />}
                  </ListItemButton>
                </Tooltip>
              ),
          )}

          {(hasPermission("sales-create") || hasPermission("sales-list")) && (
            <>
              <ListItemButton
                onClick={toggleSales}
                sx={{
                  borderRadius: 1.5,
                  py: 1.2,
                  mb: 0.5,
                  "&:hover": { backgroundColor: "#14224A" },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                >
                  <MdReceipt />
                </ListItemIcon>
                {open && (
                  <>
                    <ListItemText primary="Sales" />
                    {salesOpen ? (
                      <MdKeyboardArrowUp />
                    ) : (
                      <MdKeyboardArrowDown />
                    )}
                  </>
                )}
              </ListItemButton>

              <Collapse in={salesOpen}>
                <List disablePadding sx={{ pl: open ? 5 : 0 }}>
                  {hasPermission("sales-create") && (
                    <ListItemButton
                      component={Link}
                      to={`/${userLang}/admin/sales/create`}
                      onClick={isMobile ? () => setOpen(false) : undefined}
                      sx={{
                        borderRadius: 1.5,
                        py: 1.1,
                        "&:hover": { backgroundColor: "#14224A" },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                      >
                        <MdReceipt />
                      </ListItemIcon>
                      {open && <ListItemText primary="Sales Form" />}
                    </ListItemButton>
                  )}

                  {hasPermission("sales-list") && (
                    <ListItemButton
                      component={Link}
                      to={`/${userLang}/admin/sales/list`}
                      onClick={isMobile ? () => setOpen(false) : undefined}
                      sx={{
                        borderRadius: 1.5,
                        py: 1.1,
                        "&:hover": { backgroundColor: "#14224A" },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                      >
                        <MdListAlt />
                      </ListItemIcon>
                      {open && <ListItemText primary="Sales List" />}
                    </ListItemButton>
                  )}
                  {hasPermission("sales-list") && (
                    <ListItemButton
                      component={Link}
                      to={`/${userLang}/admin/quotations`}
                      onClick={isMobile ? () => setOpen(false) : undefined}
                      sx={{
                        borderRadius: 1.5,
                        py: 1.1,
                        "&:hover": { backgroundColor: "#14224A" },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                      >
                        <MdReceipt />
                      </ListItemIcon>
                      {open && <ListItemText primary="Quotations" />}
                    </ListItemButton>
                  )}
                </List>
              </Collapse>
            </>
          )}

          {(hasPermission("ledger-product") ||
            hasPermission("ledger-sales") ||
            hasPermission("ledger-purchase") ||
            hasPermission("ledger-customer") ||
            hasPermission("vendors") ||
            hasPermission("ledger-stock-transfer")) && (
              <>
                <ListItemButton
                  onClick={toggleLedger}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.2,
                    mb: 0.5,
                    "&:hover": { backgroundColor: "#14224A" },
                  }}
                >
                  <ListItemIcon
                    sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                  >
                    <MdListAlt />
                  </ListItemIcon>

                  {open && (
                    <>
                      <ListItemText primary="Ledger" />
                      {ledgerOpen ? (
                        <MdKeyboardArrowUp />
                      ) : (
                        <MdKeyboardArrowDown />
                      )}
                    </>
                  )}
                </ListItemButton>

                <Collapse in={ledgerOpen}>
                  <List disablePadding sx={{ pl: open ? 5 : 0 }}>
                    {hasPermission("ledger-product") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/ledger/product`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdInventory2 />
                        </ListItemIcon>
                        {open && <ListItemText primary="Product Ledger" />}
                      </ListItemButton>
                    )}

                    {hasPermission("ledger-sales") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/ledger/sales`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdReceipt />
                        </ListItemIcon>
                        {open && <ListItemText primary="Sales Ledger" />}
                      </ListItemButton>
                    )}

                    {hasPermission("ledger-purchase") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/ledger/purchase`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdShoppingCart />
                        </ListItemIcon>
                        {open && <ListItemText primary="Purchase Ledger" />}
                      </ListItemButton>
                    )}

                    {hasPermission("ledger-customer") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/ledger/customer`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdPerson />
                        </ListItemIcon>
                        {open && <ListItemText primary="Customer Ledger" />}
                      </ListItemButton>
                    )}

                    {hasPermission("vendors") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/vendorsledger`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdGroup />
                        </ListItemIcon>
                        {open && <ListItemText primary="Vendor Ledger" />}
                      </ListItemButton>
                    )}

                    {hasPermission("ledger-stock-transfer") && (
                      <ListItemButton
                        component={Link}
                        to={`/${userLang}/admin/ledger/stock-transfer`}
                        onClick={isMobile ? () => setOpen(false) : undefined}
                        sx={{
                          borderRadius: 1.5,
                          py: 1.1,
                          "&:hover": { backgroundColor: "#14224A" },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : "auto",
                            color: "#5A5A5A",
                          }}
                        >
                          <MdLocalShipping />
                        </ListItemIcon>
                        {open && <ListItemText primary="Stock Transfer Ledger" />}
                      </ListItemButton>
                    )}
                  </List>
                </Collapse>
              </>
            )}

          {hasPermission("android") && (
            <>
              <ListItemButton
                onClick={() => setAndroidOpen(!androidOpen)}
                sx={{
                  borderRadius: 1.5,
                  py: 1.2,
                  mb: 0.5,
                  "&:hover": { backgroundColor: "#14224A" },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                >
                  <MdStore />
                </ListItemIcon>

                {open && (
                  <>
                    <ListItemText primary="Android" />
                    {androidOpen ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                  </>
                )}
              </ListItemButton>

              <Collapse in={androidOpen}>
                <List disablePadding sx={{ pl: open ? 5 : 0 }}>
                  {/* ANDROID Product List PAGE */}
                  <ListItemButton
                    component={Link}
                    to={`/${userLang}/admin/android/listpage`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.1,
                      "&:hover": { backgroundColor: "#14224A" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                    >
                      <MdListAlt />
                    </ListItemIcon>
                    {open && <ListItemText primary="Product-Page" />}
                  </ListItemButton>

                  {/* ANDROID ORDER PAGE */}
                  <ListItemButton
                    component={Link}
                    to={`/${userLang}/admin/android/orderpage`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.1,
                      "&:hover": { backgroundColor: "#14224A" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                    >
                      <MdListAlt />
                    </ListItemIcon>
                    {open && <ListItemText primary="Web-Order-Page" />}
                  </ListItemButton>

                  <ListItemButton
                    component={Link}
                    to={`/${userLang}/admin/android/mobileorderpage`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.1,
                      "&:hover": { backgroundColor: "#14224A" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                    >
                      <MdListAlt />
                    </ListItemIcon>
                    {open && <ListItemText primary="Mobile-Order-Page" />}
                  </ListItemButton>

                  <ListItemButton
                    component={Link}
                    to={`/${userLang}/admin/android/mobileofferpage`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.1,
                      "&:hover": { backgroundColor: "#14224A" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                    >
                      <MdListAlt />
                    </ListItemIcon>
                    {open && <ListItemText primary="Mobile-Offer-Page" />}
                  </ListItemButton>

                  <ListItemButton
                    component={Link}
                    to={`/${userLang}/admin/android/createagent_android`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.1,
                      "&:hover": { backgroundColor: "#14224A" },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: open ? 40 : "auto", color: "#5A5A5A" }}
                    >
                      <MdListAlt />
                    </ListItemIcon>
                    {open && <ListItemText primary="Mobile-Agent-Page" />}
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}
        </List>
        <Divider />

        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1.5,
              py: 1.2,
              "&:hover": { backgroundColor: "#FFECEC" },
            }}
          >
            <ListItemIcon
              sx={{ color: "#D32F2F", minWidth: open ? 40 : "auto" }}
            >
              <MdLogout />
            </ListItemIcon>
            {open && <ListItemText primary="Logout" />}
          </ListItemButton>
        </Box>
      </Drawer>
    </>
  );
}
