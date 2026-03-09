// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Paper,
//   Typography,
//   Grid,
//   MenuItem,
//   Button,
//   Table,
//   TableHead,
//   TableBody,
//   TableRow,
//   TableCell,
//   TableContainer,
//   Pagination,
//   CircularProgress,
//   Card,
//   CardContent,
//   Chip,
//   IconButton,
//   useTheme,
//   useMediaQuery,
//   Collapse,
//   Stack,
//   Divider,
//   FormControl,
//   InputLabel,
//   Select,
// } from "@mui/material";
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { toast } from "react-toastify";
// import customFetch from "../../utils/customFetch";
// import StockTransferCharts from "../../components/Admin/StockTransferCharts";
// import FilterListIcon from "@mui/icons-material/FilterList";
// import ClearIcon from "@mui/icons-material/Clear";
// import SearchIcon from "@mui/icons-material/Search";
// import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
// import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// export default function StockTransferLedger() {
//   const [loading, setLoading] = useState(false);
//   const [transfers, setTransfers] = useState([]);
//   const [shops, setShops] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [showFilters, setShowFilters] = useState(false);
//   const [expandedRow, setExpandedRow] = useState(null);

//   // Pagination
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);

//   // Filters
//   const [filters, setFilters] = useState({
//     fromShopId: "",
//     toShopId: "",
//     productId: "",
//     startDate: null,
//     endDate: null,
//   });

//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("md"));
//   const isSmallMobile = useMediaQuery("(max-width:480px)");
//   const isExtraSmall = useMediaQuery("(max-width:320px)");

//   // Fetch shops + products
//   const fetchDropdowns = async () => {
//     try {
//       const [shopRes, productRes] = await Promise.all([
//         customFetch.get("/shops"),
//         customFetch.get("/product"),
//       ]);

//       setShops(shopRes.data?.data || shopRes.data || []);
//       setProducts(productRes.data?.products || productRes.data || []);
//     } catch (err) {
//       toast.error("Failed loading dropdown data");
//     }
//   };

//   // Fetch Transfers
//   const fetchTransfers = async () => {
//     setLoading(true);

//     try {
//       const query = new URLSearchParams({
//         page,
//         limit: 10,
//         fromShopId: filters.fromShopId,
//         toShopId: filters.toShopId,
//         productId: filters.productId,
//         startDate: filters.startDate ? filters.startDate.toISOString() : "",
//         endDate: filters.endDate ? filters.endDate.toISOString() : "",
//       });

//       const res = await customFetch.get(`/stock-transfer/transfers?${query}`);

//       setTransfers(res.data?.transfers || []);
//       setTotalPages(res.data?.totalPages || 1);
//     } catch (err) {
//       toast.error("Failed to load transfer ledger");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchDropdowns();
//   }, []);

//   useEffect(() => {
//     fetchTransfers();
//   }, [page]);

//   const handleFilterChange = (e) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   const applyFilters = () => {
//     setPage(1);
//     fetchTransfers();
//     if (isMobile) setShowFilters(false);
//   };

//   const clearFilters = () => {
//     setFilters({
//       fromShopId: "",
//       toShopId: "",
//       productId: "",
//       startDate: null,
//       endDate: null,
//     });
//     setPage(1);
//     fetchTransfers();
//   };

//   // Mobile-friendly table row component
//   const MobileTransferRow = ({ transfer, index }) => (
//     <Card key={transfer._id} sx={{ mb: 1.5, boxShadow: 2, borderRadius: 2 }}>
//       <CardContent sx={{ p: isExtraSmall ? 1.5 : 2 }}>
//         <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
//           <Typography variant="subtitle2" fontWeight="bold">
//             Transfer #{index + 1 + (page - 1) * 10}
//           </Typography>
//           <Chip
//             label={transfer.quantity}
//             color="primary"
//             size="small"
//             sx={{ height: isExtraSmall ? 22 : 26, fontWeight: "bold" }}
//           />
//         </Box>

//         <Divider sx={{ my: 1 }} />

//         <Grid container spacing={1}>
//           <Grid item xs={12}>
//             <Typography variant="caption" color="text.secondary" fontWeight="bold">
//               PRODUCT
//             </Typography>
//             <Typography variant="body2" fontWeight="500">
//               {transfer.productId?.name?.en || transfer.productId?.name}
//             </Typography>
//           </Grid>

//           <Grid item xs={6}>
//             <Typography variant="caption" color="text.secondary" fontWeight="bold">
//               FROM
//             </Typography>
//             <Typography variant="body2">
//               {transfer.fromShopId?.name?.en || transfer.fromShopId?.name}
//             </Typography>
//           </Grid>

//           <Grid item xs={6}>
//             <Typography variant="caption" color="text.secondary" fontWeight="bold">
//               TO
//             </Typography>
//             <Typography variant="body2">
//               {transfer.toShopId?.name?.en || transfer.toShopId?.name}
//             </Typography>
//           </Grid>

//           <Grid item xs={12}>
//             <Typography variant="caption" color="text.secondary" fontWeight="bold">
//               DATE
//             </Typography>
//             <Typography variant="body2">
//               {new Date(transfer.transferDate).toLocaleDateString()}
//             </Typography>
//           </Grid>
//         </Grid>
//       </CardContent>
//     </Card>
//   );

//   // Expandable row for medium screens
//   const ExpandableTableRow = ({ transfer, index }) => {
//     const isExpanded = expandedRow === index;

//     return (
//       <>
//         <TableRow
//           hover
//           onClick={() => setExpandedRow(isExpanded ? null : index)}
//           sx={{ cursor: "pointer" }}
//         >
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             {index + 1 + (page - 1) * 10}
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             {transfer.productId?.name?.en || transfer.productId?.name}
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             {transfer.fromShopId?.name?.en || transfer.fromShopId?.name}
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             {transfer.toShopId?.name?.en || transfer.toShopId?.name}
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             <Chip
//               label={transfer.quantity}
//               color="primary"
//               size="small"
//               sx={{ height: isExtraSmall ? 20 : 24 }}
//             />
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             {new Date(transfer.transferDate).toLocaleDateString()}
//           </TableCell>
//           <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
//             <IconButton size="small">
//               {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
//             </IconButton>
//           </TableCell>
//         </TableRow>

//         <TableRow>
//           <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
//             <Collapse in={isExpanded} timeout="auto" unmountOnExit>
//               <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.03)" }}>
//                 <Grid container spacing={2}>
//                   <Grid item xs={12} sm={6}>
//                     <Typography variant="subtitle2" fontWeight="bold">
//                       Product Details
//                     </Typography>
//                     <Typography variant="body2">
//                       {transfer.productId?.description || "No description available"}
//                     </Typography>
//                   </Grid>
//                   <Grid item xs={12} sm={6}>
//                     <Typography variant="subtitle2" fontWeight="bold">
//                       Transfer Information
//                     </Typography>
//                     <Typography variant="body2">Transfer ID: {transfer._id}</Typography>
//                     <Typography variant="body2">
//                       Status: {transfer.status || "Completed"}
//                     </Typography>
//                   </Grid>
//                 </Grid>
//               </Box>
//             </Collapse>
//           </TableCell>
//         </TableRow>
//       </>
//     );
//   };

//   return (
//     <LocalizationProvider dateAdapter={AdapterDateFns}>
//       <Box
//         sx={{
//           p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 2 : 3,
//           width: "100%",
//         }}
//       >
//         {/* Header */}
//         <Box
//           display="flex"
//           justifyContent="space-between"
//           alignItems="center"
//           mb={2}
//           sx={{
//             flexDirection: isSmallMobile ? "column" : "row",
//             alignItems: isSmallMobile ? "flex-start" : "center",
//             gap: isSmallMobile ? 1 : 0,
//           }}
//         >
//           <Typography
//             variant={isExtraSmall ? "subtitle2" : isSmallMobile ? "h6" : "h5"}
//             fontWeight={700}
//             sx={{
//               fontSize: isExtraSmall ? "0.875rem" : "inherit",
//               textAlign: isSmallMobile ? "center" : "left",
//               width: isSmallMobile ? "100%" : "auto",
//             }}
//           >
//             Stock Transfer Ledger
//           </Typography>

//           {isMobile && (
//             <Button
//               variant="outlined"
//               startIcon={<FilterListIcon />}
//               onClick={() => setShowFilters(!showFilters)}
//               size={isExtraSmall ? "small" : "medium"}
//               fullWidth={isSmallMobile}
//               sx={{
//                 height: isExtraSmall ? 32 : 40,
//                 fontSize: isExtraSmall ? "0.7rem" : "inherit",
//               }}
//             >
//               {showFilters ? "Hide Filters" : "Show Filters"}
//             </Button>
//           )}
//         </Box>

//         {/* Charts Section */}
//         {transfers.length > 0 && (
//           <Paper
//             sx={{
//               p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
//               mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
//               overflow: "hidden",
//             }}
//           >
//             <StockTransferCharts transfers={transfers} />
//           </Paper>
//         )}

//         {/* Filters */}
//         <Collapse in={!isMobile || showFilters}>
//           <Paper
//             sx={{
//               p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
//               mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
//             }}
//           >
//             <Typography
//               variant="h6"
//               fontWeight={600}
//               mb={2}
//               sx={{
//                 fontSize: isExtraSmall ? "0.875rem" : "inherit",
//                 textAlign: isMobile ? "center" : "left",
//               }}
//             >
//               Filter Transfers
//             </Typography>

//             <Grid container spacing={isExtraSmall ? 1 : 2}>
//               {/* From Shop */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
//                   <InputLabel id="from-shop-label">From Shop</InputLabel>
//                   <Select
//                     labelId="from-shop-label"
//                     name="fromShopId"
//                     value={filters.fromShopId}
//                     onChange={handleFilterChange}
//                     label="From Shop"
//                   >
//                     <MenuItem
//                       value=""
//                       sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                     >
//                       All
//                     </MenuItem>
//                     {shops.map((s) => (
//                       <MenuItem
//                         key={s._id}
//                         value={s._id}
//                         sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                       >
//                         {s.name?.en || s.name}
//                       </MenuItem>
//                     ))}
//                   </Select>
//                 </FormControl>
//               </Grid>

//               {/* To Shop */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
//                   <InputLabel id="to-shop-label">To Shop</InputLabel>
//                   <Select
//                     labelId="to-shop-label"
//                     name="toShopId"
//                     value={filters.toShopId}
//                     onChange={handleFilterChange}
//                     label="To Shop"
//                   >
//                     <MenuItem
//                       value=""
//                       sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                     >
//                       All
//                     </MenuItem>
//                     {shops.map((s) => (
//                       <MenuItem
//                         key={s._id}
//                         value={s._id}
//                         sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                       >
//                         {s.name?.en || s.name}
//                       </MenuItem>
//                     ))}
//                   </Select>
//                 </FormControl>
//               </Grid>

//               {/* Product */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
//                   <InputLabel id="product-label">Product</InputLabel>
//                   <Select
//                     labelId="product-label"
//                     name="productId"
//                     value={filters.productId}
//                     onChange={handleFilterChange}
//                     label="Product"
//                   >
//                     <MenuItem
//                       value=""
//                       sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                     >
//                       All
//                     </MenuItem>
//                     {products.map((p) => (
//                       <MenuItem
//                         key={p._id}
//                         value={p._id}
//                         sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//                       >
//                         {p.name?.en || p.name}
//                       </MenuItem>
//                     ))}
//                   </Select>
//                 </FormControl>
//               </Grid>

//               {/* Start Date */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <DatePicker
//                   label="Start Date"
//                   value={filters.startDate}
//                   onChange={(d) => setFilters({ ...filters, startDate: d })}
//                   slotProps={{
//                     textField: {
//                       size: isExtraSmall ? "small" : "medium",
//                       fullWidth: true,
//                       InputLabelProps: { shrink: true },
//                     },
//                   }}
//                 />
//               </Grid>

//               {/* End Date */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <DatePicker
//                   label="End Date"
//                   value={filters.endDate}
//                   onChange={(d) => setFilters({ ...filters, endDate: d })}
//                   slotProps={{
//                     textField: {
//                       size: isExtraSmall ? "small" : "medium",
//                       fullWidth: true,
//                       InputLabelProps: { shrink: true },
//                     },
//                   }}
//                 />
//               </Grid>

//               {/* Buttons */}
//               <Grid item xs={12} sm={6} md={3}>
//                 <Stack direction="row" spacing={1}>
//                   <Button
//                     variant="contained"
//                     fullWidth
//                     onClick={applyFilters}
//                     size={isExtraSmall ? "small" : "medium"}
//                     startIcon={<SearchIcon />}
//                     sx={{
//                       height: isExtraSmall ? 32 : 40,
//                       fontSize: isExtraSmall ? "0.7rem" : "inherit",
//                     }}
//                   >
//                     Apply
//                   </Button>

//                   <Button
//                     variant="outlined"
//                     fullWidth
//                     onClick={clearFilters}
//                     size={isExtraSmall ? "small" : "medium"}
//                     startIcon={<ClearIcon />}
//                     sx={{
//                       height: isExtraSmall ? 32 : 40,
//                       fontSize: isExtraSmall ? "0.7rem" : "inherit",
//                     }}
//                   >
//                     Clear
//                   </Button>
//                 </Stack>
//               </Grid>
//             </Grid>
//           </Paper>
//         </Collapse>

//         {/* Table */}
//         <Paper
//           sx={{
//             p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
//           }}
//         >
//           {loading ? (
//             <Box sx={{ textAlign: "center", py: isExtraSmall ? 2 : 4 }}>
//               <CircularProgress size={isExtraSmall ? 20 : 24} />
//               <Typography
//                 variant="body2"
//                 sx={{ mt: 1, fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//               >
//                 Loading transfers...
//               </Typography>
//             </Box>
//           ) : transfers.length === 0 ? (
//             <Box sx={{ textAlign: "center", py: isExtraSmall ? 2 : 4 }}>
//               <Typography
//                 variant={isExtraSmall ? "caption" : "body1"}
//                 color="text.secondary"
//                 sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
//               >
//                 No Records Found
//               </Typography>
//             </Box>
//           ) : isSmallMobile ? (
//             // Mobile-friendly card-based layout for table data
//             <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
//               {transfers.map((t, idx) => (
//                 <MobileTransferRow transfer={t} index={idx} key={t._id} />
//               ))}
//             </Box>
//           ) : (
//             // Regular table for larger screens with horizontal scroll enabled
//             <TableContainer
//               sx={{
//                 overflowX: "auto",
//                 width: "100%",
//               }}
//             >
//               <Table size={isSmallMobile ? "small" : "medium"}>
//                 <TableHead>
//                   <TableRow>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 40,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       #
//                     </TableCell>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 120,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       Product
//                     </TableCell>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 120,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       From Shop
//                     </TableCell>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 120,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       To Shop
//                     </TableCell>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 80,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       Quantity
//                     </TableCell>
//                     <TableCell
//                       sx={{
//                         p: isExtraSmall ? "4px 8px" : "8px 16px",
//                         fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                         minWidth: 100,
//                         fontWeight: "bold",
//                       }}
//                     >
//                       Date
//                     </TableCell>
//                     {!isMobile && (
//                       <TableCell
//                         sx={{
//                           p: isExtraSmall ? "4px 8px" : "8px 16px",
//                           fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           minWidth: 50,
//                           fontWeight: "bold",
//                         }}
//                       >
//                         Details
//                       </TableCell>
//                     )}
//                   </TableRow>
//                 </TableHead>

//                 <TableBody>
//                   {transfers.map((t, idx) =>
//                     isMobile ? (
//                       <ExpandableTableRow transfer={t} index={idx} key={t._id} />
//                     ) : (
//                       <TableRow key={t._id} hover>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           {idx + 1 + (page - 1) * 10}
//                         </TableCell>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           {t.productId?.name?.en || t.productId?.name}
//                         </TableCell>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           {t.fromShopId?.name?.en || t.fromShopId?.name}
//                         </TableCell>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           {t.toShopId?.name?.en || t.toShopId?.name}
//                         </TableCell>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           <Chip
//                             label={t.quantity}
//                             color="primary"
//                             size="small"
//                             sx={{ height: isExtraSmall ? 20 : 24 }}
//                           />
//                         </TableCell>
//                         <TableCell
//                           sx={{
//                             p: isExtraSmall ? "4px 8px" : "8px 16px",
//                             fontSize: isExtraSmall ? "0.65rem" : "inherit",
//                           }}
//                         >
//                           {new Date(t.transferDate).toLocaleDateString()}
//                         </TableCell>
//                       </TableRow>
//                     )
//                   )}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//           )}

//           {/* Pagination */}
//           <Box
//             sx={{
//               mt: isExtraSmall ? 1 : 2,
//               display: "flex",
//               justifyContent: "center",
//               flexDirection: isSmallMobile ? "column" : "row",
//               alignItems: "center",
//               gap: isSmallMobile ? 1 : 0,
//             }}
//           >
//             <Typography
//               variant="caption"
//               sx={{
//                 mr: isSmallMobile ? 0 : 2,
//                 fontSize: isExtraSmall ? "0.65rem" : "inherit",
//               }}
//             >
//               Page {page} of {totalPages}
//             </Typography>
//             <Pagination
//               count={totalPages}
//               page={page}
//               onChange={(e, val) => setPage(val)}
//               color="primary"
//               size={isExtraSmall ? "small" : "medium"}
//               siblingCount={isExtraSmall ? 0 : 1}
//               boundaryCount={isExtraSmall ? 1 : 2}
//               showFirstButton={!isExtraSmall}
//               showLastButton={!isExtraSmall}
//             />
//           </Box>
//         </Paper>
//       </Box>
//     </LocalizationProvider>
//   );
// }



import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Pagination,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Collapse,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import StockTransferCharts from "../../components/Admin/StockTransferCharts";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function StockTransferLedger() {
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [toShops, setToShops] = useState([]);

  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [exporting, setExporting] = useState(false);


  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    fromShopId: "",
    toShopId: "",
    productId: "",
    startDate: null,
    endDate: null,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery("(max-width:480px)");
  const isExtraSmall = useMediaQuery("(max-width:320px)");

  // Fetch shops + products
 const fetchDropdowns = async () => {
  try {
    const [userRes, shopRes, godownRes, productRes] = await Promise.all([
      customFetch.get("/auth/current-user"),
      customFetch.get("/shops"),
      customFetch.get("/godowns"),
      customFetch.get("/product"),
    ]);

    const user = userRes.data?.user || {};

    const shopsData = shopRes.data || [];
    const godownsData =
      godownRes.data?.data ||
      godownRes.data?.godowns ||
      godownRes.data ||
      [];

    const formattedShops = shopsData.map((s) => ({
      _id: s._id,
      name: s.name?.en || s.name,
      type: "Shop",
    }));

    const formattedGodowns = godownsData.map((g) => ({
      _id: g._id,
      name: g.name?.en || g.name,
      type: "Godown",
      parentShopId: g.shopId?._id || g.shopId,
    }));

    const allLocations = [...formattedShops, ...formattedGodowns];

    if (user.role === "admin") {
      setShops(allLocations);
      setToShops(allLocations);
    } else {
      const userShopId = user?.shopId?._id || user?.shopId;

      const fromAllowed = allLocations.filter((loc) => {
        if (loc.type === "Shop") return loc._id === String(userShopId);
        if (loc.type === "Godown") return loc.parentShopId === String(userShopId);
      });

      const toAllowed = allLocations;

      setShops(fromAllowed);
      setToShops(toAllowed);
    }

  const productList =
  productRes.data?.products ||
  productRes.data?.data ||
  productRes.data ||
  [];

setProducts(productList);

  } catch (err) {
    toast.error("Failed loading dropdown data");
  }
};


  // Fetch Transfers
  const fetchTransfers = async (exportAll = false) => {
    setLoading(true);

    try {
      const limit = exportAll ? 10000 : 10; // Get all records for export
    const query = new URLSearchParams({
  page: exportAll ? 1 : page,
  limit,
  fromLocationId: filters.fromShopId,
  toLocationId: filters.toShopId,   // ✔ Works for both Shop & Godown
  productId: filters.productId,
  startDate: filters.startDate ? filters.startDate.toISOString().split("T")[0] : "",
  endDate: filters.endDate ? filters.endDate.toISOString().split("T")[0] : "",
});


      const res = await customFetch.get(`/stock-transfer/transfers?${query}`);

      if (exportAll) {
        return res.data?.transfers || [];
      } else {
        setTransfers(res.data?.transfers || []);
        setTotalPages(res.data?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load transfer ledger");
    } finally {
      if (!exportAll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

 useEffect(() => {
  fetchTransfers();
}, [page, filters]);


  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    setPage(1);
    // fetchTransfers();
    if (isMobile) setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      fromShopId: "",
      toShopId: "",
      productId: "",
      startDate: null,
      endDate: null,
    });
    setPage(1);
    fetchTransfers();
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const allTransfers = await fetchTransfers(true);
      
      const excelData = allTransfers.map((transfer, index) => ({
        '#': index + 1,
        'Product': transfer.productId?.name?.en || transfer.productId?.name,
        'From Shop': transfer.fromShopId?.name?.en || transfer.fromShopId?.name,
        'To Shop': transfer.toShopId?.name?.en || transfer.toShopId?.name,
        'Quantity': transfer.quantity,
        'Date': new Date(transfer.transferDate).toLocaleDateString(),
        'Status': transfer.status || "Completed",
        'Transfer ID': transfer._id,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Transfers");
      
      XLSX.writeFile(workbook, "Stock_Transfer_Ledger.xlsx");
      toast.success("Excel export successful");
    } catch (error) {
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const allTransfers = await fetchTransfers(true);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text("Stock Transfer Ledger", 105, 15, { align: "center" });
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: "center" });
      
      // Prepare table data
      const tableData = allTransfers.map((transfer, index) => [
        index + 1,
        transfer.productId?.name?.en || transfer.productId?.name,
        transfer.fromShopId?.name?.en || transfer.fromShopId?.name,
        transfer.toShopId?.name?.en || transfer.toShopId?.name,
        transfer.quantity,
        new Date(transfer.transferDate).toLocaleDateString(),
        transfer.status || "Completed",
      ]);
      
      // Add table with error handling
      try {
        doc.autoTable({
          head: [["#", "Product", "From Shop", "To Shop", "Quantity", "Date", "Status"]],
          body: tableData,
          startY: 30,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 66, 66] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 30 },
        });
      } catch (tableError) {
        console.error("PDF table generation error:", tableError);
        // Fallback if table generation fails
        doc.setFontSize(12);
        doc.text("Error generating table. Please try again.", 20, 40);
      }
      
      doc.save("Stock_Transfer_Ledger.pdf");
      toast.success("PDF export successful");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  // Mobile-friendly table row component
  const MobileTransferRow = ({ transfer, index }) => (
    <Card key={transfer._id} sx={{ mb: 1.5, boxShadow: 2, borderRadius: 2 }}>
      <CardContent sx={{ p: isExtraSmall ? 1.5 : 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" fontWeight="bold">
            Transfer #{index + 1 + (page - 1) * 10}
          </Typography>
          <Chip
            label={transfer.quantity}
            color="primary"
            size="small"
            sx={{ height: isExtraSmall ? 22 : 26, fontWeight: "bold" }}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              PRODUCT
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {transfer.productId?.name?.en || transfer.productId?.name}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              FROM
            </Typography>
            <Typography variant="body2">
             {transfer.fromShopId
  ? transfer.fromShopId?.name?.en || transfer.fromShopId?.name
  : transfer.fromGodownId?.name?.en || transfer.fromGodownId?.name}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              TO
            </Typography>
            <Typography variant="body2">
             
{transfer.toShopId
  ? transfer.toShopId?.name?.en || transfer.toShopId?.name
  : transfer.toGodownId?.name?.en || transfer.toGodownId?.name}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              DATE
            </Typography>
            <Typography variant="body2">
              {new Date(transfer.transferDate).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Expandable row for medium screens
  const ExpandableTableRow = ({ transfer, index }) => {
    const isExpanded = expandedRow === index;

    return (
      <>
        <TableRow
          hover
          onClick={() => setExpandedRow(isExpanded ? null : index)}
          sx={{ cursor: "pointer" }}
        >
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
            {index + 1 + (page - 1) * 10}
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
            {transfer.productId?.name?.en || transfer.productId?.name}
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
           {transfer.fromShopId
  ? transfer.fromShopId?.name?.en || transfer.fromShopId?.name
  : transfer.fromGodownId?.name?.en || transfer.fromGodownId?.name}
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
         
{transfer.toShopId
  ? transfer.toShopId?.name?.en || transfer.toShopId?.name
  : transfer.toGodownId?.name?.en || transfer.toGodownId?.name}
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
            <Chip
              label={transfer.quantity}
              color="primary"
              size="small"
              sx={{ height: isExtraSmall ? 20 : 24 }}
            />
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
            {new Date(transfer.transferDate).toLocaleDateString()}
          </TableCell>
          <TableCell sx={{ p: isExtraSmall ? "4px 8px" : "8px 16px" }}>
            <IconButton size="small">
              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.03)" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Product Details
                    </Typography>
                    <Typography variant="body2">
                      {transfer.productId?.description || "No description available"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Transfer Information
                    </Typography>
                    <Typography variant="body2">Transfer ID: {transfer._id}</Typography>
                    <Typography variant="body2">
                      Status: {transfer.status || "Completed"}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 2 : 3,
          width: "100%",
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          sx={{
            flexDirection: isSmallMobile ? "column" : "row",
            alignItems: isSmallMobile ? "flex-start" : "center",
            gap: isSmallMobile ? 1 : 0,
          }}
        >
          <Typography
            variant={isExtraSmall ? "subtitle2" : isSmallMobile ? "h6" : "h5"}
            fontWeight={700}
            sx={{
              fontSize: isExtraSmall ? "0.875rem" : "inherit",
              textAlign: isSmallMobile ? "center" : "left",
              width: isSmallMobile ? "100%" : "auto",
            }}
          >
            Stock Transfer Ledger
          </Typography>

          <Box display="flex" gap={1}>
            {isMobile && (
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                size={isExtraSmall ? "small" : "medium"}
                fullWidth={isSmallMobile}
                sx={{
                  height: isExtraSmall ? 32 : 40,
                  fontSize: isExtraSmall ? "0.7rem" : "inherit",
                }}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            )}

            {/* Export Buttons - Icons Only */}
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={exportToExcel}
                size={isExtraSmall ? "small" : "medium"}
                disabled={exporting || transfers.length === 0}
                sx={{
                  height: isExtraSmall ? 32 : 40,
                  width: isExtraSmall ? 32 : 40,
                }}
              >
                <TableChartIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export to PDF">
              <IconButton
                onClick={exportToPDF}
                size={isExtraSmall ? "small" : "medium"}
                disabled={exporting || transfers.length === 0}
                sx={{
                  height: isExtraSmall ? 32 : 40,
                  width: isExtraSmall ? 32 : 40,
                }}
              >
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Charts Section */}
        {transfers.length > 0 && (
          <Paper
            sx={{
              p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
              mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
              overflow: "hidden",
            }}
          >
            <StockTransferCharts transfers={transfers} />
          </Paper>
        )}

        {/* Filters */}
        <Collapse in={!isMobile || showFilters}>
          <Paper
            sx={{
              p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
              mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              mb={2}
              sx={{
                fontSize: isExtraSmall ? "0.875rem" : "inherit",
                textAlign: isMobile ? "center" : "left",
              }}
            >
              Filter Transfers
            </Typography>

            <Grid container spacing={isExtraSmall ? 1 : 2}>
              {/* From Shop */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
                  <InputLabel id="from-shop-label">From Shop</InputLabel>
                  <Select
                    labelId="from-shop-label"
                    name="fromShopId"
                    value={filters.fromShopId}
                    onChange={handleFilterChange}
                    label="From Shop" sx={{width:150}}
                  >
                    <MenuItem
                      value=""
                      sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
                    >
                      All
                    </MenuItem>
                    {shops.map((s) => (
                      <MenuItem
                        key={s._id}
                        value={s._id}
                        sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
                      >
                        {s.name?.en || s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* To Shop */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
                  <InputLabel id="to-shop-label">To Shop</InputLabel>
                  <Select
                    labelId="to-shop-label"
                    name="toShopId"
                    value={filters.toShopId}
                    onChange={handleFilterChange}
                    label="To Shop" sx={{width:150}}
                  >
                    <MenuItem
                      value=""
                      sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
                    >
                      All
                    </MenuItem>
                   {toShops.map((loc) => (
    <MenuItem key={loc._id} value={loc._id}>
       {loc.name} ({loc.type})
    </MenuItem>
))}

                  </Select>
                </FormControl>
              </Grid>

              {/* Product */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isExtraSmall ? "small" : "medium"}>
                  <InputLabel id="product-label">Product</InputLabel>
                  <Select
                    labelId="product-label"
                    name="productId"
                    value={filters.productId}
                    onChange={handleFilterChange}
                    label="Product"  sx={{width:150}}
                  >
                    <MenuItem
                      value=""
                      sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
                    >
                      All
                    </MenuItem>
                    {products.map((p) => (
                      <MenuItem
                        key={p._id}
                        value={p._id}
                        sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
                      >
                        {p.name?.en || p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(d) => setFilters({ ...filters, startDate: d })}
                  slotProps={{
                    textField: {
                      size: isExtraSmall ? "small" : "medium",
                      fullWidth: true,
                      InputLabelProps: { shrink: true },
                    },
                  }}
                />
              </Grid>

              {/* End Date */}
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(d) => setFilters({ ...filters, endDate: d })}
                  slotProps={{
                    textField: {
                      size: isExtraSmall ? "small" : "medium",
                      fullWidth: true,
                      InputLabelProps: { shrink: true },
                    },
                  }}
                />
              </Grid>

              {/* Buttons */}
              <Grid item xs={12} sm={6} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={applyFilters}
                    size={isExtraSmall ? "small" : "medium"}
                    startIcon={<SearchIcon />}
                    sx={{
                      height: isExtraSmall ? 32 : 40,
                      fontSize: isExtraSmall ? "0.7rem" : "inherit",
                    }}
                  >
                    Apply
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={clearFilters}
                    size={isExtraSmall ? "small" : "medium"}
                    startIcon={<ClearIcon />}
                    sx={{
                      height: isExtraSmall ? 32 : 40,
                      fontSize: isExtraSmall ? "0.7rem" : "inherit",
                    }}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Table */}
        <Paper
          sx={{
            p: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", py: isExtraSmall ? 2 : 4 }}>
              <CircularProgress size={isExtraSmall ? 20 : 24} />
              <Typography
                variant="body2"
                sx={{ mt: 1, fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
              >
                Loading transfers...
              </Typography>
            </Box>
          ) : transfers.length === 0 ? (
            <Box sx={{ textAlign: "center", py: isExtraSmall ? 2 : 4 }}>
              <Typography
                variant={isExtraSmall ? "caption" : "body1"}
                color="text.secondary"
                sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
              >
                No Records Found
              </Typography>
            </Box>
          ) : isSmallMobile ? (
            // Mobile-friendly card-based layout for table data
            <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
              {transfers.map((t, idx) => (
                <MobileTransferRow transfer={t} index={idx} key={t._id} />
              ))}
            </Box>
          ) : (
            // Regular table for larger screens with horizontal scroll enabled
            <TableContainer
              sx={{
                overflowX: "auto",
                width: "100%",
              }}
            >
              <Table size={isSmallMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 40,
                        fontWeight: "bold",
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 120,
                        fontWeight: "bold",
                      }}
                    >
                      Product
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 120,
                        fontWeight: "bold",
                      }}
                    >
                      From Shop
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 120,
                        fontWeight: "bold",
                      }}
                    >
                      To Shop
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 80,
                        fontWeight: "bold",
                      }}
                    >
                      Quantity
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall ? "4px 8px" : "8px 16px",
                        fontSize: isExtraSmall ? "0.65rem" : "inherit",
                        minWidth: 100,
                        fontWeight: "bold",
                      }}
                    >
                      Date
                    </TableCell>
                    {!isMobile && (
                      <TableCell
                        sx={{
                          p: isExtraSmall ? "4px 8px" : "8px 16px",
                          fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          minWidth: 50,
                          fontWeight: "bold",
                        }}
                      >
                        Details
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {transfers.map((t, idx) =>
                    isMobile ? (
                      <ExpandableTableRow transfer={t} index={idx} key={t._id} />
                    ) : (
                      <TableRow key={t._id} hover>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                          {idx + 1 + (page - 1) * 10}
                        </TableCell>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                          {t.productId?.name?.en || t.productId?.name}
                        </TableCell>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                         {t.fromShopId
    ? t.fromShopId?.name?.en || t.fromShopId?.name
    : t.fromGodownId?.name?.en || t.fromGodownId?.name}
                        </TableCell>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                          {t.fromShopId
    ? t.fromShopId?.name?.en || t.fromShopId?.name
    : t.fromGodownId?.name?.en || t.fromGodownId?.name}
                        </TableCell>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                          <Chip
                            label={t.quantity}
                            color="primary"
                            size="small"
                            sx={{ height: isExtraSmall ? 20 : 24 }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            p: isExtraSmall ? "4px 8px" : "8px 16px",
                            fontSize: isExtraSmall ? "0.65rem" : "inherit",
                          }}
                        >
                          {new Date(t.transferDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          <Box
            sx={{
              mt: isExtraSmall ? 1 : 2,
              display: "flex",
              justifyContent: "center",
              flexDirection: isSmallMobile ? "column" : "row",
              alignItems: "center",
              gap: isSmallMobile ? 1 : 0,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                mr: isSmallMobile ? 0 : 2,
                fontSize: isExtraSmall ? "0.65rem" : "inherit",
              }}
            >
              Page {page} of {totalPages}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, val) => setPage(val)}
              color="primary"
              size={isExtraSmall ? "small" : "medium"}
              siblingCount={isExtraSmall ? 0 : 1}
              boundaryCount={isExtraSmall ? 1 : 2}
              showFirstButton={!isExtraSmall}
              showLastButton={!isExtraSmall}
            />
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}