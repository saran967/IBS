import React, { useEffect, useState } from "react";
import customFetch from "../../utils/customFetch";
import { useNavigate } from "react-router-dom";

const MobileOrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOrder, setModalOrder] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  /* ================= FETCH ================= */
  const fetchOrders = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const limit = 10;

      const res = await customFetch.get(
        `/order/get?page=${pageNumber}&limit=${limit}`,
      );

      const sorted = (res.data.orders || []).sort((a, b) =>
        a.orderNumber.localeCompare(b.orderNumber),
      );

      setOrders(sorted);
      setPage(res.data.pagination.currentPage);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  /* ================= NORMALIZE ROWS ================= */
  const rows = [];

  orders.forEach((order) => {
    const orderRowSpan = order.items.reduce((sum, item) => {
      const companies =
        item.companyItems && item.companyItems.length > 0
          ? item.companyItems.filter((c) => c.quantity > 0)
          : [null];
      return sum + companies.length;
    }, 0);

    order.items.forEach((item, itemIndex) => {
      const companies =
        item.companyItems && item.companyItems.length > 0
          ? item.companyItems.filter((c) => c.quantity > 0)
          : [null];

      companies.forEach((company, companyIndex) => {
        rows.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.customerName,
          totalAmount: order.totalAmount,
          status: order.status,

          productName:
            typeof item.product?.name === "object"
              ? item.product.name.en
              : item.product?.name,

          productQty: item.quantity,
          price: item.price,

          companyName: company ? company.companyName : "-",
          companyQty: company ? company.quantity : item.quantity,

          showOrder: itemIndex === 0 && companyIndex === 0,
          orderRowSpan,

          showProduct: companyIndex === 0,
          productRowSpan: companies.length,
        });
      });
    });
  });

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        {error}
      </div>
    );

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-200">
            <tr>
              {[
                "Order #",
                "Customer",
                // "Products",
                // "Qty",
                // "Company",
                // "Company Qty",
                // "Price",
                // "Total",
                "Status",
                "Action",
                "Mobile Order",
                "Complete",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-center font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-blue-50">
                {row.showOrder && (
                  <td rowSpan={row.orderRowSpan} className="px-4 py-3">
                    {row.orderNumber}
                  </td>
                )}

                {row.showOrder && (
                  <td rowSpan={row.orderRowSpan} className="px-4 py-3">
                    {row.customerName?.en || row.customerName}
                  </td>
                )}

                {/* {row.showProduct && (
                  <td
                    rowSpan={row.productRowSpan}
                    className="px-4 py-3 font-semibold"
                  >
                    {row.productName}
                  </td>
                )} */}
                {/* 
                {row.showProduct && (
                  <td
                    rowSpan={row.productRowSpan}
                    className="px-4 py-3 text-center"
                  >
                    {row.productQty}
                  </td>
                )} */}

                {/* <td className="px-4 py-3">{row.companyName}</td>
                <td className="px-4 py-3 text-center">{row.companyQty}</td>
                <td className="px-4 py-3 text-right">₹{row.price}</td>

                {row.showOrder && (
                  <td
                    rowSpan={row.orderRowSpan}
                    className="px-4 py-3 text-right font-semibold"
                  >
                    ₹{row.totalAmount}
                  </td>
                )} */}

                {row.showOrder && (
                  <td
                    rowSpan={row.orderRowSpan}
                    className="px-4 py-3 text-center"
                  >
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                      {row.status}
                    </span>
                  </td>
                )}

                {/* ACTION */}
                {row.showOrder && (
                  <td
                    rowSpan={row.orderRowSpan}
                    className="px-4 py-3 text-center"
                  >
                    <button
                      onClick={() =>
                        setModalOrder(
                          orders.find((o) => o.orderNumber === row.orderNumber),
                        )
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                )}

                {/* MOBILE ORDER (SEPARATE COLUMN) */}
                {row.showOrder && (
                  <td
                    rowSpan={row.orderRowSpan}
                    className="px-4 py-3 text-center"
                  >
                    <button
                      onClick={() =>
                        navigate("/en/admin/android/orderpage", {
                          state: {
                            prefillOrder: {
                              customer: orders.find(
                                (o) => o.orderNumber === row.orderNumber,
                              )?.customer?._id,
                              items: orders
                                .find((o) => o.orderNumber === row.orderNumber)
                                ?.items.map((item) => ({
                                  product: item.product?._id,
                                  quantity: item.quantity,
                                  price: item.price,
                                  companyItems: item.companyItems,
                                })),
                            },
                          },
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs cursor-pointer"
                    >
                      Mobile-Order
                    </button>
                  </td>
                )}

                {/* COMPLETE */}
                {row.showOrder && (
                  <td
                    rowSpan={row.orderRowSpan}
                    className="px-4 py-3 text-center"
                  >
                    <button className="bg-green-600 text-white px-4 py-1.5 rounded text-xs cursor-pointer">
                      Completed
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex gap-4 justify-center mt-6">
        <button
          disabled={page === 1}
          onClick={() => fetchOrders(page - 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
        >
          Prev
        </button>

        <span className="px-4 py-2">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => fetchOrders(page + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
        >
          Next
        </button>
      </div>

      {/* ================= MODAL ================= */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-y-auto p-6">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Order Details – {modalOrder.orderNumber}
              </h2>
              <button
                onClick={() => setModalOrder(null)}
                className="text-red-500 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* ORDER INFO */}
            <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-semibold">
                  {modalOrder.customer?.customerName?.en ||
                    modalOrder.customer?.customerName ||
                    "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Status</p>
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  {modalOrder.status}
                </span>
              </div>

              <div>
                <p className="text-gray-500">Total Amount</p>
                <p className="font-semibold">₹{modalOrder.totalAmount}</p>
              </div>

              <div>
                <p className="text-gray-500">Products</p>
                <p className="font-semibold">{modalOrder.items.length}</p>
              </div>
            </div>

            {/* PRODUCTS TABLE */}
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-center">Company Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>

                <tbody>
                  {modalOrder.items.map((item, itemIndex) => {
                    const companies =
                      item.companyItems && item.companyItems.length > 0
                        ? item.companyItems.filter((c) => c.quantity > 0)
                        : [null]; //  B2C fallback

                    return companies.map((company, cIndex) => (
                      <tr key={`${itemIndex}-${cIndex}`} className="border-t">
                        {/* PRODUCT */}
                        {cIndex === 0 && (
                          <td
                            rowSpan={companies.length}
                            className="px-3 py-2 font-semibold"
                          >
                            {typeof item.product?.name === "object"
                              ? item.product.name.en
                              : item.product?.name}
                          </td>
                        )}

                        {/* QTY */}
                        {cIndex === 0 && (
                          <td
                            rowSpan={companies.length}
                            className="px-3 py-2 text-center"
                          >
                            {item.quantity}
                          </td>
                        )}

                        {/* COMPANY */}
                        <td className="px-3 py-2">
                          {company ? company.companyName : "Direct Sale"}
                        </td>

                        {/* COMPANY QTY */}
                        <td className="px-3 py-2 text-center">
                          {company ? company.quantity : item.quantity}
                        </td>

                        {/* PRICE */}
                        <td className="px-3 py-2 text-right">₹{item.price}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setModalOrder(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileOrderPage;
