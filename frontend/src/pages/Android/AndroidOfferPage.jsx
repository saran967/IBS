import React, { useEffect, useState } from "react";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";

const ITEMS_PER_PAGE = 8;

const AndroidOfferPage = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  //  pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    offerType: "percentage",
    value: "",
    applyOn: "product",
    product: "",
    category: "",
    startDate: "",
    endDate: "",
    message: "",
  });

  /* ================= FETCH DATA ================= */
  const fetchProducts = async () => {
    try {
      const res = await customFetch.get("/product");
      setProducts(res.data.products || []);
      const uniqueCats = [
        ...new Set(res.data.products.map((p) => p.category.en)),
      ];
      setCategories(uniqueCats);
    } catch {
      toast.error("Failed to load products");
    }
  };

  //  SERVER SIDE PAGINATION
  const fetchOffers = async (pageNumber = 1) => {
    try {
      const res = await customFetch.get(
        `/offer?page=${pageNumber}&limit=${ITEMS_PER_PAGE}`,
      );

      setOffers(res.data.offers || []);
      setPage(res.data.pagination.currentPage);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.log(error, "error data");
      toast.error("Failed to load offers");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOffers(1);
  }, []);

  /* ================= FORM ================= */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({
      title: "",
      offerType: "percentage",
      value: "",
      applyOn: "product",
      product: "",
      category: "",
      startDate: "",
      endDate: "",
      message: "",
    });
    setEditingId(null);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form };
    if (form.applyOn === "product") payload.category = "";
    if (form.applyOn === "category") payload.product = "";

    try {
      if (editingId) {
        await customFetch.put(`/offer/${editingId}`, payload);
        toast.success("Offer updated");
      } else {
        await customFetch.post("/offer/create", payload);
        toast.success("Offer created");
      }
      resetForm();
      fetchOffers(page); //  refresh current page
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  /* ================= EDIT ================= */
  const handleEdit = (offer) => {
    setEditingId(offer._id);
    setForm({
      title: offer.title,
      offerType: offer.offerType,
      value: offer.value,
      applyOn: offer.applyOn,
      product: offer.product?.[0] || "",
      category: offer.category || "",
      startDate: offer.startDate?.slice(0, 10),
      endDate: offer.endDate?.slice(0, 10),
      message: offer.message || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    try {
      await customFetch.delete(`/offer/${id}`);
      toast.success("Offer deleted");
      fetchOffers(page); //  stay on same page
    } catch {
      toast.error("Delete failed");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* ================= FORM ================= */}
        <div className="rounded-2xl bg-white border shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-6">
            {editingId ? "Edit Offer" : "Create Offer"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Offer Title"
              required
              className={inputClass}
            />

            <select
              name="offerType"
              value={form.offerType}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
              <option value="fixed">Fixed</option>
            </select>

            <input
              type="number"
              name="value"
              value={form.value}
              onChange={handleChange}
              placeholder="Discount Value"
              required
              className={inputClass}
            />

            <select
              name="applyOn"
              value={form.applyOn}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="product">Product</option>
              <option value="category">Category</option>
            </select>

            {form.applyOn === "product" && (
              <select
                name="product"
                value={form.product}
                onChange={handleChange}
                required
                className={`${inputClass} sm:col-span-2`}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name.en}
                  </option>
                ))}
              </select>
            )}

            {form.applyOn === "category" && (
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className={`${inputClass} sm:col-span-2`}
              >
                <option value="">Select Category</option>
                {categories.map((c, i) => (
                  <option key={i}>{c}</option>
                ))}
              </select>
            )}

            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Message (optional)"
              className={`${inputClass} sm:col-span-2`}
            />

            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
              <button className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition cursor-pointer">
                {editingId ? "Update Offer" : "Create Offer"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================= TABLE ================= */}
        <div className="rounded-2xl bg-white border shadow-sm overflow-x-auto">
          <table className="min-w-[650px] w-full text-sm text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 font-medium">S.No</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Apply On</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, index) => (
                <tr
                  key={o._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{o.title}</td>
                  <td>{o.offerType}</td>
                  <td>{o.value}</td>
                  <td>{o.applyOn}</td>
                  <td className="space-x-3">
                    <button
                      onClick={() => handleEdit(o)}
                      className="text-blue-600 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(o._id)}
                      className="text-red-600 font-medium cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {/* PREV */}
          <button
            disabled={page === 1}
            onClick={() => fetchOffers(page - 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 cursor-pointer"
          >
            Prev
          </button>

          {/* PAGE NUMBER */}
          <span className="px-3 py-1.5 text-sm font-medium">{page}</span>

          {/* NEXT */}
          <button
            disabled={page === totalPages}
            onClick={() => fetchOffers(page + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AndroidOfferPage;
