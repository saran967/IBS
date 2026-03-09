

// import React, { useState, useEffect } from "react";
// import {
//   TextField,
//   Button,
//   Box,
//   Typography,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
// } from "@mui/material";
// import { toast } from "react-toastify";
// import customFetch from "../../utils/customFetch.js";

// const AddSubAdminForm = ({ onClose }) => {
//   const [formData, setFormData] = useState({
//     name: "",
//     name_ta: "",
//     email: "",
//     password: "",
//     shopId: "",
//     roleType: "subadmin",
//   });

//   const [shops, setShops] = useState([]);

//   // Only Admin can access this — handled in AdminControl.jsx
//   // Here we load all shops for selection
//   useEffect(() => {
//     const fetchShops = async () => {
//       try {
//         const res = await customFetch.get("/shops");
//         setShops(res.data);
//       } catch (err) {
//         console.error("Error fetching shops:", err);
//       }
//     };
//     fetchShops();
//   }, []);

//   const handleChange = (e) =>
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!formData.name || !formData.email || !formData.password || !formData.shopId) {
//       toast.error("Please fill all required fields");
//       return;
//     }

//     try {
//       // Backend expects these fields names:
//       const payload = {
//         shopId: formData.shopId,
//         subAdminName: formData.name,
//         subAdminName_ta: formData.name_ta,
//         subAdminEmail: formData.email,
//         subAdminPassword: formData.password,
//       };

//       await customFetch.post("/users/subadmin", payload);
//       toast.success("Subadmin created successfully");
//       onClose();
//     } catch (err) {
//       console.error("Error creating subadmin:", err);
//       toast.error(err.response?.data?.message || "Error creating subadmin");
//     }
//   };

//   return (
//     <Box component="form" onSubmit={handleSubmit}>
//       <Typography variant="h6" gutterBottom>
//         Add Subadmin
//       </Typography>

//       <TextField
//         label="Name (EN)"
//         name="name"
//         value={formData.name}
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Name (TA)"
//         name="name_ta"
//         value={formData.name_ta}
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Email"
//         name="email"
//         value={formData.email}
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Password"
//         name="password"
//         type="password"
//         value={formData.password}
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       {/* SHOP DROPDOWN — Admin only */}
//       <FormControl fullWidth margin="normal">
//         <InputLabel>Shop</InputLabel>
//         <Select
//           name="shopId"
//           value={formData.shopId}
//           onChange={handleChange}
//           label="Shop"
//         >
//           {shops.map((shop) => (
//             <MenuItem key={shop._id} value={shop._id}>
//               {shop.name?.en || shop.name}
//             </MenuItem>
//           ))}
//         </Select>
//       </FormControl>

//       <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
//         Create Subadmin
//       </Button>
//     </Box>
//   );
// };

// export default AddSubAdminForm;




import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch.js";

const AddSubAdminForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ta: "",
    email: "",
    password: "",
    shopId: "",
    roleType: "subadmin",
  });

  const [shops, setShops] = useState([]);

  // Only Admin can access this — handled in AdminControl.jsx
  // Here we load all shops for selection
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await customFetch.get("/shops");
        setShops(res.data);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };
    fetchShops();
  }, []);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.shopId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Backend expects these fields names:
      const payload = {
        shopId: formData.shopId,
        subAdminName: formData.name,
        subAdminName_ta: formData.name_ta,
        subAdminEmail: formData.email,
        subAdminPassword: formData.password,
      };

      await customFetch.post("/users/subadmin", payload);
      toast.success("Subadmin created successfully");
      onClose();
    } catch (err) {
      console.error("Error creating subadmin:", err);
      toast.error(err.response?.data?.message || "Error creating subadmin");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Add Subadmin
      </Typography>

      <TextField
        label="Name (EN)"
        name="name"
        value={formData.name}
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Name (TA)"
        name="name_ta"
        value={formData.name_ta}
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Email"
        name="email"
        value={formData.email}
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      {/* SHOP DROPDOWN — Admin only */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Shop</InputLabel>
        <Select
          name="shopId"
          value={formData.shopId}
          onChange={handleChange}
          label="Shop"
        >
          {shops.map((shop) => (
            <MenuItem key={shop._id} value={shop._id}>
              {shop.name?.en || shop.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
        Create Subadmin
      </Button>
    </Box>
  );
};

export default AddSubAdminForm;