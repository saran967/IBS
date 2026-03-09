// import React, { useEffect, useState } from "react";
// import customFetch from "../../utils/customFetch";
// import { useParams } from "react-router-dom";
// import TrackMap from "./TrackMap";

// const TrackedRoutes = () => {
//   const { id } = useParams();
//   const [routes, setRoutes] = useState([]);
//   const [selectedRoute, setSelectedRoute] = useState(null);

//   const loadRoutes = async () => {
//     try {
//       const res = await customFetch.get(`/location/history/${id}`);
//       setRoutes(res.data);
//       console.log("Backend Data:", res.data);
//     } catch (error) {
//       alert("Failed to fetch tracking history");
//     }
//   };

//   useEffect(() => {
//     loadRoutes();
//   }, [id]);

//   return (
//     <div className="p-5">
//       <h1 className="text-xl bg-gray-800 text-white p-3 font-bold rounded">
//         Agent Tracking History
//       </h1>

//       {/* TABLE */}
//       <table className="w-full mt-4 bg-white shadow border-collapse">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Route ID</th>
//             <th className="border p-2">Start Time</th>
//             <th className="border p-2">End Time</th>
//             <th className="border p-2">Shops</th>
//             <th className="border p-2">Products</th>
//             <th className="border p-2">Total Amount</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>

//         <tbody>
//           {routes.map((item) => {
//             const totalAmount = item.shops?.reduce(
//               (sum, s) => sum + s.grandTotal,
//               0
//             );

//             return (
//               <tr key={item._id} className="hover:bg-gray-50">
//                 <td className="border p-2">{item._id}</td>

//                 <td className="border p-2">
//                   {new Date(item.startedAt).toLocaleString()}
//                 </td>

//                 <td className="border p-2">
//                   {new Date(item.endedAt).toLocaleString()}
//                 </td>

//                 <td className="border p-2">{item.shops?.length || 0}</td>

//                 {/* PRODUCT LIST */}
//                 <td className="border p-2 text-sm max-h-40 overflow-y-auto">
//                   {item.shops?.length > 0 ? (
//                     item.shops.map((shop) =>
//                       shop.order?.map((o) => (
//                         <div key={o._id}>
//                           Product: {o.productId} <br />
//                           Qty: {o.qty} | Price: ₹{o.unitPrice}
//                           <hr />
//                         </div>
//                       ))
//                     )
//                   ) : (
//                     <span>No orders</span>
//                   )}
//                 </td>

//                 <td className="border p-2 font-bold text-green-700">
//                   ₹{totalAmount}
//                 </td>

//                 <td className="border p-2">
//                   <button
//                     className="bg-blue-600 text-white px-3 py-1 rounded"
//                     onClick={() => {
//                       window.scrollTo({ top: 0, behavior: "smooth" });
//                       setSelectedRoute(item);
//                     }}
//                   >
//                     View Path
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       {/* MAP SECTION */}
//       {selectedRoute && (
//         <div className="mt-6 border shadow-lg rounded-lg p-3">
//           <h2 className="text-lg font-bold mb-2">
//             Route Path: {selectedRoute._id}
//           </h2>

//           {/* FIXED HEIGHT CONTAINER */}
//           <div className="w-full h-[600px]">
//             <TrackMap route={selectedRoute} />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TrackedRoutes;

import React, { useEffect, useState } from "react";
import customFetch from "../../utils/customFetch";
import { useParams } from "react-router-dom";
import TrackMap from "./TrackMap";
import {
  Calendar,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const TrackedRoutes = () => {
  const { id } = useParams();

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadRoutes = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await customFetch.get(
        `/location/history/${id}?page=${pageNumber}&limit=10`,
      );

      //  Handle both paginated & non-paginated response
      if (Array.isArray(res.data)) {
        // NON-paginated
        setRoutes(res.data);
        setTotalPages(1);
        setPage(1);
      } else {
        // Paginated
        setRoutes(Array.isArray(res.data.routes) ? res.data.routes : []);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
      }
    } catch (error) {
      alert("Failed to fetch tracking history");
    } finally {
      setLoading(false);
    }
  };

  const toggleProducts = (routeId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [routeId]: !prev[routeId],
    }));
  };

  useEffect(() => {
    loadRoutes(page);
  }, [id, page]);

  const closeMap = () => {
    setSelectedRoute(null);
  };

  const nextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const RouteCard = ({ item }) => {
    const totalAmount =
      item.shops?.reduce((sum, s) => sum + s.grandTotal, 0) || 0;

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-slate-300 truncate">
              {item._id}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300">
                {new Date(item.startedAt).toLocaleDateString()}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(item.startedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-slate-300">
                {new Date(item.endedAt).toLocaleDateString()}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(item.endedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Shops</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
              {item.shops?.length || 0}
            </span>
          </div>

          {item.shops?.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {item.shops.map((shop, shopIdx) =>
                shop.order?.map((o, orderIdx) => (
                  <div
                    key={`${shopIdx}-${orderIdx}`}
                    className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-200"
                  >
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
                      <Package className="w-3 h-3" />
                      <span>
                        Product:{" "}
                        {typeof o.productId?.name === "object"
                          ? o.productId?.name?.en
                          : o.productId?.name}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Qty: {o.qty} | ₹{o.unitPrice}
                    </div>
                  </div>
                )),
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic block">
              No orders
            </span>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-600 font-medium">Total</span>
            <div className="flex items-center gap-1">
              {/* <DollarSign className="w-4 h-4 text-emerald-600" /> */}
              <span className="text-lg font-bold text-emerald-700">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg mt-3"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setSelectedRoute(item);
            }}
          >
            View Path
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 md:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 md:mb-2">
            Agent Tracking History
          </h1>
          <p className="text-sm md:text-base text-slate-600">
            View detailed route history and billing information
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16 md:py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-600 text-white">
                      <th className="px-4 py-4 text-left text-sm font-semibold">
                        Route ID
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold">
                        Start Time
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold">
                        End Time
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-semibold">
                        Shops
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold">
                        Products
                      </th>
                      <th className="px-4 py-4 text-right text-sm font-semibold">
                        Total Amount
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {routes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No routes found for this agent
                        </td>
                      </tr>
                    ) : (
                      routes.map((item) => {
                        const totalAmount =
                          item.shops?.reduce(
                            (sum, s) => sum + s.grandTotal,
                            0,
                          ) || 0;

                        return (
                          <tr
                            key={item._id}
                            className="hover:bg-slate-50 transition-colors duration-150"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm font-mono text-slate-700 truncate max-w-[120px]">
                                  {item._id}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <div className="text-sm">
                                  <div className="text-slate-700 font-medium">
                                    {new Date(
                                      item.startedAt,
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-slate-500 text-xs">
                                    {new Date(
                                      item.startedAt,
                                    ).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                <div className="text-sm">
                                  <div className="text-slate-700 font-medium">
                                    {new Date(
                                      item.endedAt,
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-slate-500 text-xs">
                                    {new Date(
                                      item.endedAt,
                                    ).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                                {item.shops?.length || 0}
                              </span>
                            </td>

                            {/* <td className="px-4 py-4">
                              <div className="max-h-32 overflow-y-auto">
                                {item.shops?.length > 0 ? (
                                  <div className="space-y-2">
                                    {item.shops.map((shop, shopIdx) =>
                                      shop.order?.map((o, orderIdx) => (
                                        <div
                                          key={`${shopIdx}-${orderIdx}`}
                                          className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-200"
                                        >
                                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                                            <Package className="w-3 h-3" />
                                            <span>Prod: {o.productId.name?.en}</span>
                                          </div>
                                          <div className="text-slate-600 mt-1">
                                            Qty: {o.qty} | Price: ₹{o.unitPrice}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm italic">
                                    No orders
                                  </span>
                                )}
                              </div>
                            </td> */}
                            <td className="px-4 py-4">
                              {item.shops?.length > 0 ? (
                                <>
                                  {/* Header (count + toggle) */}
                                  <button
                                    onClick={() => toggleProducts(item._id)}
                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    <Package className="w-4 h-4" />
                                    <span>
                                      {item.shops.reduce(
                                        (sum, s) =>
                                          sum + (s.order?.length || 0),
                                        0,
                                      )}{" "}
                                      Products
                                    </span>
                                    <span className="text-lg">
                                      {expandedProducts[item._id] ? "▲" : "▼"}
                                    </span>
                                  </button>

                                  {/* Expandable product list */}
                                  {expandedProducts[item._id] && (
                                    <div className="mt-3 space-y-2">
                                      {item.shops.map((shop, shopIdx) =>
                                        shop.order?.map((o, orderIdx) => (
                                          <div
                                            key={`${shopIdx}-${orderIdx}`}
                                            className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-200"
                                          >
                                            <div className="font-medium text-slate-700">
                                              {typeof o.productId?.name ===
                                              "object"
                                                ? o.productId?.name?.en
                                                : o.productId?.name}
                                            </div>
                                            <div className="text-slate-600">
                                              Qty: {o.qty} | ₹{o.unitPrice}
                                            </div>
                                          </div>
                                        )),
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 italic text-sm">
                                  No orders
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* <DollarSign className="w-4 h-4 text-emerald-600" /> */}
                                <span className="text-lg font-bold text-emerald-700">
                                  ₹{totalAmount.toLocaleString()}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <button
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                onClick={() => {
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                  setSelectedRoute(item);
                                }}
                              >
                                View Path
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4 mb-6">
              {routes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
                  No routes found for this agent
                </div>
              ) : (
                routes.map((item) => <RouteCard key={item._id} item={item} />)
              )}
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-8 bg-white rounded-lg shadow-md p-4 sm:p-6">
                <button
                  disabled={page === 1}
                  onClick={prevPage}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    page === 1
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-600 text-sm font-medium">
                    Page
                  </span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 rounded-lg font-semibold transition-all duration-200 text-sm ${
                            page === pageNum
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ),
                    )}
                  </div>
                  <span className="text-slate-600 text-sm font-medium">
                    of {totalPages}
                  </span>
                </div>

                <button
                  disabled={page === totalPages}
                  onClick={nextPage}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    page === totalPages
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {selectedRoute && (
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <MapPin className="w-6 h-6" />
                    Route Path: {selectedRoute._id}
                  </h2>
                  <p className="text-slate-300 mt-1">
                    View the complete journey and stop locations
                  </p>
                </div>

                <div className="p-4">
                  <div className="w-full h-[500px] sm:h-[600px] rounded-lg overflow-hidden shadow-inner">
                    <TrackMap route={selectedRoute} onClose={closeMap} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackedRoutes;
