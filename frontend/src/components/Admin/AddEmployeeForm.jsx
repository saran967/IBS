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

// const AddEmployeeForm = ({ onClose, currentUser }) => {
//   const [formData, setFormData] = useState({
//     name: "",
//     name_ta: "",
//     email: "",
//     password: "",
//     shopId: "",
//     roleType: "user",
//   });

//   const [shops, setShops] = useState([]);
//   const role = currentUser?.role;

//   const isAdmin = role === "admin";
//   const isSubAdmin = role === "subadmin";

//   //  For subadmin: shopId is fixed
//   useEffect(() => {
//     if (isSubAdmin) {
//       setFormData((prev) => ({
//         ...prev,
//         shopId: currentUser.shopId,
//       }));
//     }
//   }, [currentUser, isSubAdmin]);

//   // 🏪 Load shops only if admin
//   useEffect(() => {
//     const fetchShops = async () => {
//       if (isAdmin) {
//         try {
//           const res = await customFetch.get("/shops");
//           setShops(res.data);
//         } catch (err) {
//           console.error("Error fetching shops", err);
//         }
//       }
//     };
//     fetchShops();
//   }, [isAdmin]);

//   const handleChange = (e) =>
//     setFormData({ ...formData, [e.target.name]: e.target.value });

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const { name, email, password, shopId } = formData;

//     if (!name || !email || !password || !shopId) {
//       toast.error("Please fill all required fields");
//       return;
//     }

//     try {
//       await customFetch.post("/users/employee", formData);
//       toast.success("Employee added successfully");
//       onClose();
//     } catch (err) {
//       toast.error(err.response?.data?.msg || "Error adding employee");
//     }
//   };

//   return (
//     <Box component="form" onSubmit={handleSubmit}>
//       <Typography variant="h6" gutterBottom>
//         Add Employee
//       </Typography>

//       <TextField
//         label="Name (EN)"
//         name="name"
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Name (TA)"
//         name="name_ta"
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Email"
//         name="email"
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       <TextField
//         label="Password"
//         name="password"
//         type="password"
//         fullWidth
//         margin="normal"
//         onChange={handleChange}
//       />

//       {/* ✔ SHOP SELECTION */}
//       <FormControl fullWidth margin="normal">
//         <InputLabel>Shop</InputLabel>
//         <Select
//           name="shopId"
//           value={formData.shopId}
//           onChange={handleChange}
//           disabled={isSubAdmin} //  Subadmin cannot change shop
//           label="Shop"
//         >
//           {/* ADMIN sees all shops */}
//           {isAdmin &&
//             shops.map((shop) => (
//               <MenuItem key={shop._id} value={shop._id}>
//                 {shop.name?.en || shop.name}
//               </MenuItem>
//             ))}

//           {/* SUBADMIN sees only their own shop */}
//           {isSubAdmin && (
//             <MenuItem value={currentUser.shopId}>
//               {currentUser?.shopName?.en ||
//                 currentUser?.shopName ||
//                 "My Shop"}
//             </MenuItem>
//           )}
//         </Select>
//       </FormControl>

//       <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
//         Add Employee
//       </Button>
//     </Box>
//   );
// };

// export default AddEmployeeForm;

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

const AddEmployeeForm = ({ onClose, currentUser, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ta: "",
    email: "",
    password: "",
    shopId: "",
    roleType: "user",
  });

  const [shops, setShops] = useState([]);
  const role = currentUser?.role;

  const isAdmin = role === "admin";
  const isSubAdmin = role === "subadmin";

  //  For subadmin: shopId is fixed
  useEffect(() => {
    if (isSubAdmin) {
      setFormData((prev) => ({
        ...prev,
        shopId: currentUser.shopId,
      }));
    }
  }, [currentUser, isSubAdmin]);

  // 🏪 Load shops only if admin
  useEffect(() => {
    const fetchShops = async () => {
      if (isAdmin) {
        try {
          const res = await customFetch.get("/shops");
          setShops(res.data);
        } catch (err) {
          console.error("Error fetching shops", err);
        }
      }
    };
    fetchShops();
  }, [isAdmin]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, password, shopId } = formData;

    if (!name || !email || !password || !shopId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await customFetch.post("/users/employee", formData);
      toast.success("Employee added successfully");
      if (onSuccess) onSuccess();
      else if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error adding employee");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Add Employee
      </Typography>

      <TextField
        label="Name (EN)"
        name="name"
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Name (TA)"
        name="name_ta"
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Email"
        name="email"
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        fullWidth
        margin="normal"
        onChange={handleChange}
      />

      {/* ✔ SHOP SELECTION */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Shop</InputLabel>
        <Select
          name="shopId"
          value={formData.shopId}
          onChange={handleChange}
          disabled={isSubAdmin} //  Subadmin cannot change shop
          label="Shop"
        >
          {/* ADMIN sees all shops */}
          {isAdmin &&
            shops.map((shop) => (
              <MenuItem key={shop._id} value={shop._id}>
                {shop.name?.en || shop.name}
              </MenuItem>
            ))}

          {/* SUBADMIN sees only their own shop */}
          {isSubAdmin && (
            <MenuItem value={currentUser.shopId}>
              {currentUser?.shopName?.en || currentUser?.shopName || "My Shop"}
            </MenuItem>
          )}
        </Select>
      </FormControl>

      <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
        Add Employee
      </Button>
    </Box>
  );
};

export default AddEmployeeForm;
