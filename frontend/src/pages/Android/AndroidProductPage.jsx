// import React, { useState, useRef, useEffect } from "react";
// import { Box, TextField, Button } from "@mui/material";
// import { toast } from "react-toastify";
// import JsBarcode from "jsbarcode";
// import customFetch from "../../utils/customFetch";

// const AndroidProductPage = ({ refreshList, editProduct, clearEdit }) => {
//   const [formData, setFormData] = useState({
//     name_en: "",
//     name_ta: "",
//     category_en: "",
//     category_ta: "",
//     unit_en: "",
//     unit_ta: "",
//     productCode: "",
//     weight: "",
//     purchasePrice: "",
//     profitPercentage: "",
//     gstPercentage: "",
//     sellingPrice: "",
//     sellingPriceforB2B: "",
//     sellingPriceforB2C: "",
//     images: [], // New uploads
//     existingImages: [], // Existing images
//   });

//   const inputRefs = useRef([]);
//   const svgRef = useRef(null);

//   // Prefill data when editing
//   useEffect(() => {
//     if (editProduct) {
//       setFormData({
//         name_en: editProduct.name?.en || "",
//         name_ta: editProduct.name?.ta || "",
//         category_en: editProduct.category?.en || "",
//         category_ta: editProduct.category?.ta || "",
//         unit_en: editProduct.unit?.en || "",
//         unit_ta: editProduct.unit?.ta || "",
//         productCode: editProduct.productCode || "",
//         weight: editProduct.weight || "",
//         purchasePrice: editProduct.purchasePrice || "",
//         profitPercentage: editProduct.profitPercentage || "",
//         gstPercentage: editProduct.gstPercentage || "",
//         sellingPrice: editProduct.sellingPrice || "",
//         sellingPriceforB2B: editProduct.sellingPriceforB2B || "",
//         sellingPriceforB2C: editProduct.sellingPriceforB2C || "",
//         images: [],
//         existingImages: editProduct.images || [],
//       });
//     }
//   }, [editProduct]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (
//       ["weight", "purchasePrice", "profitPercentage", "gstPercentage"].includes(
//         name
//       ) &&
//       value !== "" &&
//       !/^\d*\.?\d*$/.test(value)
//     ) return;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleImageUpload = (e) => {
//     const files = Array.from(e.target.files);
//     setFormData((prev) => ({ ...prev, images: files }));
//   };

//   const removeExistingImage = (index) => {
//     setFormData((prev) => {
//       const updated = [...prev.existingImages];
//       updated.splice(index, 1);
//       return { ...prev, existingImages: updated };
//     });
//   };

//   const handleKeyDown = (e, index) => {
//     if (e.key === "Enter") {
//       e.preventDefault();
//       const next = inputRefs.current[index + 1];
//       if (next) next.focus();
//       else handleSubmit();
//     }
//   };

//   const handleSubmit = async () => {
//     try {
//       if (!formData.name_en.trim()) return toast.error("English name required");
//       if (!formData.productCode.trim()) return toast.error("Product code required");

//       const fd = new FormData();

//       // Text fields
//       fd.append("name[en]", formData.name_en);
//       fd.append("name[ta]", formData.name_ta);
//       fd.append("category[en]", formData.category_en);
//       fd.append("category[ta]", formData.category_ta);
//       fd.append("unit[en]", formData.unit_en);
//       fd.append("unit[ta]", formData.unit_ta);
//       fd.append("productCode", formData.productCode);
//       fd.append("weight", formData.weight || 0);
//       fd.append("purchasePrice", formData.purchasePrice || 0);
//       fd.append("profitPercentage", formData.profitPercentage || 0);
//       fd.append("gstPercentage", formData.gstPercentage || 0);
//       fd.append("sellingPrice", formData.sellingPrice || 0);
//       fd.append("sellingPriceforB2B", formData.sellingPriceforB2B || 0);
//       fd.append("sellingPriceforB2C", formData.sellingPriceforB2C || 0);

//       // Existing images
//       fd.append("existingImages", JSON.stringify(formData.existingImages));

//       // New uploaded images
//       formData.images.forEach((file) => {
//         fd.append("images", file);
//       });

//       if (editProduct) {
//         await customFetch.patch(`/product/${editProduct._id}`, fd, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//         toast.success("Product updated successfully");
//         clearEdit();
//       } else {
//         await customFetch.post("/product", fd, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//         toast.success("Product added successfully");
//       }

//       refreshList();
//       setFormData({
//         name_en: "",
//         name_ta: "",
//         category_en: "",
//         category_ta: "",
//         unit_en: "",
//         unit_ta: "",
//         productCode: "",
//         weight: "",
//         purchasePrice: "",
//         profitPercentage: "",
//         gstPercentage: "",
//         sellingPrice: "",
//         sellingPriceforB2B: "",
//         sellingPriceforB2C: "",
//         images: [],
//         existingImages: [],
//       });
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error saving product");
//     }
//   };

//   // Barcode generation
//   useEffect(() => {
//     if (formData.productCode && svgRef.current) {
//       svgRef.current.innerHTML = "";
//       JsBarcode(svgRef.current, formData.productCode, {
//         format: "CODE128",
//         width: 2,
//         height: 40,
//         displayValue: true,
//       });
//     }
//   }, [formData.productCode]);

//   const fields = [
//     { label: "Name (EN)", name: "name_en" },
//     { label: "Name (TA)", name: "name_ta" },
//     { label: "Category (EN)", name: "category_en" },
//     { label: "Category (TA)", name: "category_ta" },
//     { label: "Unit (EN)", name: "unit_en" },
//     { label: "Unit (TA)", name: "unit_ta" },
//     { label: "Weight (kg)", name: "weight" },
//     { label: "Purchase Price", name: "purchasePrice" },
//     { label: "Profit %", name: "profitPercentage" },
//     { label: "GST %", name: "gstPercentage" },
//     { label: "Selling Price", name: "sellingPrice" },
//     { label: "Selling Price B2B", name: "sellingPriceforB2B" },
//     { label: "Selling Price B2C", name: "sellingPriceforB2C" },
//     { label: "Product Code", name: "productCode" },
//   ];

//   return (
//     <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 2, p: 2, bgcolor: "#fafafa", borderRadius: 2 }}>
//       {fields.map((f, i) => (
//         <TextField
//           key={f.name}
//           label={f.label}
//           name={f.name}
//           value={formData[f.name]}
//           onChange={handleChange}
//           onKeyDown={(e) => handleKeyDown(e, i)}
//           inputRef={(el) => (inputRefs.current[i] = el)}
//           size="small"
//           sx={{ flex: "1 1 13%", minWidth: 140 }}
//         />
//       ))}

//       {/* Existing Images */}
//       {formData.existingImages.length > 0 && (
//         <Box sx={{ flex: "1 1 100%", mt: 1 }}>
//           <strong>Existing Images:</strong>
//           <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
//             {formData.existingImages.map((img, idx) => (
//               <Box key={idx} sx={{ position: "relative" }}>
//                 <img src={img} alt="existing" width={60} height={60} style={{ objectFit: "cover", borderRadius: 4 }} />
//                 <Button
//                   size="small"
//                   color="error"
//                   onClick={() => removeExistingImage(idx)}
//                   sx={{ position: "absolute", top: 0, right: 0, minWidth: 0, padding: "2px 5px" }}
//                 >
//                   x
//                 </Button>
//               </Box>
//             ))}
//           </Box>
//         </Box>
//       )}

//       {/* Upload new images */}
//       <Button variant="outlined" component="label" sx={{ flex: "1 1 20%", minWidth: 200 }}>
//         Upload Images
//         <input type="file" name="images" hidden multiple onChange={handleImageUpload} />
//       </Button>

//       {formData.images.length > 0 && (
//         <Box sx={{ flex: "1 1 100%", mt: 1, color: "green" }}>
//           {formData.images.length} file(s) selected
//         </Box>
//       )}

//       <Button variant="contained" onClick={handleSubmit} sx={{ flex: "1 1 10%", minWidth: 120 }}>
//         {editProduct ? "Update" : "Add"}
//       </Button>

//       {editProduct && (
//         <Button variant="outlined" color="warning" onClick={clearEdit} sx={{ flex: "1 1 10%", minWidth: 120 }}>
//           Cancel
//         </Button>
//       )}

//       {formData.productCode && (
//         <Box sx={{ flex: "1 1 100%", textAlign: "center", mt: 1 }}>
//           <svg ref={svgRef} />
//         </Box>
//       )}
//     </Box>
//   );
// };

// export default AndroidProductPage;

import React, { useState, useRef, useEffect } from "react";
import { Box, TextField, Button } from "@mui/material";
import { toast } from "react-toastify";
import JsBarcode from "jsbarcode";
import customFetch from "../../utils/customFetch";

const AndroidProductPage = ({ refreshList, editProduct, clearEdit }) => {
  const [formData, setFormData] = useState({
    name_en: "",
    name_ta: "",
    category_en: "",
    category_ta: "",
    unit_en: "",
    unit_ta: "",
    productCode: "",
    weight: "",
    purchasePrice: "",
    profitPercentage: "",
    gstPercentage: "",
    sellingPrice: "",
    sellingPriceforB2B: "",
    sellingPriceforB2C: "",
    sellingPriceforAgent: "",
    description: "",
    images: [],
    existingImages: [],
  });

  const inputRefs = useRef([]);
  const svgRef = useRef(null);

  // Prefill form when editing
  useEffect(() => {
    if (editProduct) {
      setFormData({
        name_en: editProduct.name?.en || "",
        name_ta: editProduct.name?.ta || "",
        category_en: editProduct.category?.en || "",
        category_ta: editProduct.category?.ta || "",
        unit_en: editProduct.unit?.en || "",
        unit_ta: editProduct.unit?.ta || "",
        productCode: editProduct.productCode || "",
        weight: editProduct.weight || "",
        purchasePrice: editProduct.purchasePrice || "",
        profitPercentage: editProduct.profitPercentage || "",
        gstPercentage: editProduct.gstPercentage || "",
        sellingPrice: editProduct.sellingPrice || "",
        sellingPriceforB2B: editProduct.sellingPriceforB2B || "",
        sellingPriceforB2C: editProduct.sellingPriceforB2C || "",
        sellingPriceforAgent: editProduct.sellingPriceforAgent || "",
        images: [],
        description: editProduct.description || "",
        existingImages: editProduct.images || [],
      });
    }
  }, [editProduct]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (
      ["weight", "purchasePrice", "profitPercentage", "gstPercentage"].includes(
        name
      ) &&
      value !== "" &&
      !/^\d*\.?\d*$/.test(value)
    )
      return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle new image uploads
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, images: files }));
  };

  // Remove existing image
  const removeExistingImage = (index) => {
    setFormData((prev) => {
      const updated = [...prev.existingImages];
      updated.splice(index, 1);
      return { ...prev, existingImages: updated };
    });
  };

  // Navigate between fields on Enter
  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[index + 1];
      if (next) next.focus();
      else handleSubmit();
    }
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      if (!formData.name_en.trim()) return toast.error("English name required");
      if (!formData.productCode.trim())
        return toast.error("Product code required");

      const fd = new FormData();

      // Append text fields
      fd.append("name[en]", formData.name_en);
      fd.append("name[ta]", formData.name_ta);
      fd.append("category[en]", formData.category_en);
      fd.append("category[ta]", formData.category_ta);
      fd.append("unit[en]", formData.unit_en);
      fd.append("unit[ta]", formData.unit_ta);
      fd.append("productCode", formData.productCode);
      fd.append("weight", formData.weight || 0);
      fd.append("purchasePrice", formData.purchasePrice || 0);
      fd.append("profitPercentage", formData.profitPercentage || 0);
      fd.append("gstPercentage", formData.gstPercentage || 0);
      fd.append("sellingPrice", formData.sellingPrice || 0);
      fd.append("sellingPriceforB2B", formData.sellingPriceforB2B || 0);
      fd.append("sellingPriceforB2C", formData.sellingPriceforB2C || 0);
      fd.append("sellingPriceforAgent", formData.sellingPriceforAgent || 0);
      fd.append("description", formData.description);

      // Append existing images
      fd.append("existingImages", JSON.stringify(formData.existingImages));

      // Append new uploaded images
      formData.images.forEach((file) => fd.append("images", file));

      // Call API
      if (editProduct) {
        await customFetch.patch(`/product/${editProduct._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Product updated successfully");
        clearEdit();
      } else {
        await customFetch.post("/product", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Product added successfully");
      }

      refreshList();
      setFormData({
        name_en: "",
        name_ta: "",
        category_en: "",
        category_ta: "",
        unit_en: "",
        unit_ta: "",
        productCode: "",
        weight: "",
        purchasePrice: "",
        profitPercentage: "",
        gstPercentage: "",
        sellingPrice: "",
        sellingPriceforB2B: "",
        sellingPriceforB2C: "",
        sellingPriceforAgent: "",
        images: [],
        description: "",
        existingImages: [],
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving product");
    }
  };

  // Barcode preview
  useEffect(() => {
    if (formData.productCode && svgRef.current) {
      svgRef.current.innerHTML = "";
      JsBarcode(svgRef.current, formData.productCode, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
      });
    }
  }, [formData.productCode]);

  const fields = [
    { label: "Name (EN)", name: "name_en" },
    { label: "Name (TA)", name: "name_ta" },
    { label: "Category (EN)", name: "category_en" },
    { label: "Category (TA)", name: "category_ta" },
    { label: "Unit (EN)", name: "unit_en" },
    { label: "Unit (TA)", name: "unit_ta" },
    { label: "Weight (kg)", name: "weight" },
    { label: "Purchase Price", name: "purchasePrice" },
    { label: "Profit %", name: "profitPercentage" },
    { label: "GST %", name: "gstPercentage" },
    { label: "Selling Price", name: "sellingPrice" },
    { label: "Selling Price B2B", name: "sellingPriceforB2B" },
    { label: "Selling Price B2C", name: "sellingPriceforB2C" },
    { label: "Selling Price Agent", name: "sellingPriceforAgent" },
    { label: "Product Code", name: "productCode" },
    { label: "Description", name: "description" },
  ];

  return (
    <Box
      display="flex"
      flexWrap="wrap"
      gap={1}
      sx={{ mb: 2, p: 2, bgcolor: "#fafafa", borderRadius: 2 }}
    >
      {fields.map((f, i) => (
        <TextField
          key={f.name}
          label={f.label}
          name={f.name}
          value={formData[f.name]}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, i)}
          inputRef={(el) => (inputRefs.current[i] = el)}
          size="small"
          sx={{ flex: "1 1 13%", minWidth: 140 }}
        />
      ))}

      {/* Existing Images */}
      {formData.existingImages.length > 0 && (
        <Box sx={{ flex: "1 1 100%", mt: 1 }}>
          <strong>Existing Images:</strong>
          <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
            {formData.existingImages.map((img, idx) => (
              <Box key={idx} sx={{ position: "relative" }}>
                <img
                  src={img}
                  alt="existing"
                  width={60}
                  height={60}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeExistingImage(idx)}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    minWidth: 0,
                    padding: "2px 5px",
                  }}
                >
                  x
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* New Image Upload */}
      <Button
        variant="outlined"
        component="label"
        sx={{ flex: "1 1 20%", minWidth: 200 }}
      >
        Upload Images
        <input
          type="file"
          name="images"
          hidden
          multiple
          onChange={handleImageUpload}
        />
      </Button>

      {formData.images.length > 0 && (
        <Box sx={{ flex: "1 1 100%", mt: 1, color: "green" }}>
          {formData.images.length} new file(s) selected
        </Box>
      )}

      <Button
        variant="contained"
        onClick={handleSubmit}
        sx={{ flex: "1 1 10%", minWidth: 120 }}
      >
        {editProduct ? "Update" : "Add"}
      </Button>

      {editProduct && (
        <Button
          variant="outlined"
          color="warning"
          onClick={clearEdit}
          sx={{ flex: "1 1 10%", minWidth: 120 }}
        >
          Cancel
        </Button>
      )}

      {/* Barcode preview */}
      {formData.productCode && (
        <Box sx={{ flex: "1 1 100%", textAlign: "center", mt: 1 }}>
          <svg ref={svgRef} />
        </Box>
      )}
    </Box>
  );
};

export default AndroidProductPage;
