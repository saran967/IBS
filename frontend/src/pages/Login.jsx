// import { useState } from "react";
// import {
//   Box,
//   Button,
//   TextField,
//   Typography,
//   IconButton,
//   InputAdornment,
//   Link,
//   CircularProgress,
//   Container,
// } from "@mui/material";
// import {
//   Visibility,
//   VisibilityOff,
//   Email as EmailIcon,
//   Lock as LockIcon,
// } from "@mui/icons-material";
// import { useAuth } from "../context/AuthContext";
// import { useNavigate, useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const Login = () => {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const { lang } = useParams();
//   const userLang = lang || "en";

//   const [form, setForm] = useState({ email: "", password: "" });
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [errors, setErrors] = useState({ email: "", password: "" });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm({ ...form, [name]: value });
//     if (errors[name]) setErrors({ ...errors, [name]: "" });
//   };

//   const validateForm = () => {
//     const newErrors = { email: "", password: "" };
//     let isValid = true;

//     if (!form.email) {
//       newErrors.email = "Email is required";
//       isValid = false;
//     } else if (!/\S+@\S+\.\S+/.test(form.email)) {
//       newErrors.email = "Please enter a valid email";
//       isValid = false;
//     }

//     if (!form.password) {
//       newErrors.password = "Password is required";
//       isValid = false;
//     } else if (form.password.length < 6) {
//       newErrors.password = "Password must be at least 6 characters";
//       isValid = false;
//     }

//     setErrors(newErrors);
//     return isValid;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       setLoading(true);
//       const data = await login(form);
//       toast.success(data.msg || "Login successful");

//       // 🧩 Delay navigation until AuthContext updates
//       setTimeout(() => {
//         const role = data.user.role;
//         if (role === "superadmin")
//           navigate(`/${userLang}/superadmin`, { replace: true });
//         else if (role === "admin")
//           navigate(`/${userLang}/admin`, { replace: true });
//         else navigate(`/${userLang}/subadmin`, { replace: true });
//       }, 200);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Box sx={{ display: "flex", minHeight: "100vh" }}>
//       {/* Left Section (Form) */}
//       <Box
//         sx={{
//           width: { xs: "100%", lg: "50%" },
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           p: 3,
//           bgcolor: "#fafafa",
//         }}
//       >
//         <Container maxWidth="sm">
//           <Box sx={{ width: "100%", maxWidth: 450 }}>
//             <Box sx={{ mb: 8 }}>
//               <Typography
//                 variant="h4"
//                 sx={{ fontWeight: 300, color: "#333", mb: 1 }}
//               >
//                 Crextio
//               </Typography>
//             </Box>

//             <Box sx={{ mb: 6 }}>
//               <Typography
//                 variant="h4"
//                 sx={{ fontWeight: 300, color: "#333", mb: 2 }}
//               >
//                 Sign in to your account
//               </Typography>
//               <Typography variant="body2" sx={{ color: "#757575" }}>
//                 Welcome back! Please enter your details
//               </Typography>
//             </Box>

//             {/* Form */}
//             <Box component="form" onSubmit={handleSubmit} noValidate>
//               <TextField
//                 fullWidth
//                 label="Email"
//                 name="email"
//                 type="email"
//                 value={form.email}
//                 onChange={handleChange}
//                 error={Boolean(errors.email)}
//                 helperText={errors.email}
//                 margin="normal"
//                 variant="outlined"
//                 placeholder="example@email.com"
//                 InputProps={{
//                   startAdornment: (
//                     <InputAdornment position="start">
//                       <EmailIcon sx={{ color: "#9e9e9e" }} />
//                     </InputAdornment>
//                   ),
//                 }}
//                 sx={{
//                   mb: 2,
//                   "& .MuiOutlinedInput-root": {
//                     borderRadius: 2,
//                     bgcolor: "white",
//                     "& fieldset": { borderColor: "#e0e0e0" },
//                     "&:hover fieldset": { borderColor: "#333" },
//                     "&.Mui-focused fieldset": {
//                       borderColor: "#333",
//                       borderWidth: 2,
//                     },
//                   },
//                   "& .MuiInputLabel-root": {
//                     color: "#757575",
//                     "&.Mui-focused": { color: "#333" },
//                   },
//                 }}
//               />

//               <TextField
//                 fullWidth
//                 label="Password"
//                 name="password"
//                 type={showPassword ? "text" : "password"}
//                 value={form.password}
//                 onChange={handleChange}
//                 error={Boolean(errors.password)}
//                 helperText={errors.password}
//                 margin="normal"
//                 variant="outlined"
//                 placeholder="••••••••••••••••••"
//                 InputProps={{
//                   startAdornment: (
//                     <InputAdornment position="start">
//                       <LockIcon sx={{ color: "#9e9e9e" }} />
//                     </InputAdornment>
//                   ),
//                   endAdornment: (
//                     <InputAdornment position="end">
//                       <IconButton
//                         onClick={() => setShowPassword(!showPassword)}
//                         edge="end"
//                         aria-label="toggle password visibility"
//                       >
//                         {showPassword ? <VisibilityOff /> : <Visibility />}
//                       </IconButton>
//                     </InputAdornment>
//                   ),
//                 }}
//                 sx={{
//                   mb: 3,
//                   "& .MuiOutlinedInput-root": {
//                     borderRadius: 2,
//                     bgcolor: "white",
//                     "& fieldset": { borderColor: "#e0e0e0" },
//                     "&:hover fieldset": { borderColor: "#333" },
//                     "&.Mui-focused fieldset": {
//                       borderColor: "#333",
//                       borderWidth: 2,
//                     },
//                   },
//                   "& .MuiInputLabel-root": {
//                     color: "#757575",
//                     "&.Mui-focused": { color: "#333" },
//                   },
//                 }}
//               />

//               <Button
//                 type="submit"
//                 fullWidth
//                 variant="contained"
//                 size="large"
//                 disabled={loading}
//                 sx={{
//                   borderRadius: 2,
//                   py: 1.5,
//                   fontSize: "1rem",
//                   fontWeight: 500,
//                   textTransform: "none",
//                   bgcolor: "#ffd54f",
//                   color: "#333",
//                   "&:hover": { bgcolor: "#ffca28" },
//                   "&:disabled": { bgcolor: "#e0e0e0", color: "#9e9e9e" },
//                   mb: 2,
//                 }}
//               >
//                 {loading ? (
//                   <CircularProgress size={24} sx={{ color: "#333" }} />
//                 ) : (
//                   "Submit"
//                 )}
//               </Button>
//             </Box>

//             <Box sx={{ mt: 4, textAlign: "center" }}>
//               <Typography variant="body2" sx={{ color: "#757575" }}>
//                 Don't have an account?{" "}
//                 <Link
//                   href="#"
//                   underline="hover"
//                   sx={{ color: "#333", fontWeight: 500 }}
//                 >
//                   Contact admin
//                 </Link>
//               </Typography>
//             </Box>

//             <Box sx={{ mt: 6, textAlign: "center" }}>
//               <Link
//                 href="#"
//                 underline="always"
//                 sx={{
//                   color: "#9e9e9e",
//                   fontSize: "0.75rem",
//                   "&:hover": { color: "#757575" },
//                 }}
//               >
//                 Terms & Conditions
//               </Link>
//             </Box>
//           </Box>
//         </Container>
//       </Box>

//       {/* Right Image Section */}
//       <Box
//         sx={{
//           display: { xs: "none", lg: "block" },
//           width: "50%",
//           position: "relative",
//           overflow: "hidden",
//           bgcolor: "#f5f5f5",
//         }}
//       >
//         <Box
//           sx={{
//             position: "absolute",
//             inset: 0,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <Box
//             component="img"
//             src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
//             alt="Team collaboration"
//             sx={{ width: "100%", height: "100%", objectFit: "cover" }}
//           />
//         </Box>
//       </Box>
//     </Box>
//   );
// };

// export default Login;


import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Link,
  CircularProgress,
  Container,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import log from "./../assets/login.png"
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams();
  const userLang = lang || "en";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!form.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const data = await login(form);
      toast.success(data.msg || "Login successful");

      setTimeout(() => {
        const role = data.user.role;
        if (role === "superadmin")
          navigate(`/${userLang}/superadmin`, { replace: true });
        else if (role === "admin")
          navigate(`/${userLang}/admin`, { replace: true });
        else navigate(`/${userLang}/subadmin`, { replace: true });
      }, 200);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Left Section (Form) */}
      <Box
        sx={{
          width: { xs: "100%", lg: "50%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "#fafafa",
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ width: "100%", maxWidth: 450 }}>
            <Box sx={{ mb: 8 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 300, color: "#333", mb: 1 }}
              >
                ISMATH MALIGAI
              </Typography>
              <Typography variant="body2" sx={{ color: "#757575" }}>
                Smart Billing & Inventory Management
              </Typography>
            </Box>

            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 300, color: "#333", mb: 2 }}
              >
                Billing Software Login
              </Typography>
              <Typography variant="body2" sx={{ color: "#757575" }}>
                Sign in to manage invoices, sales, and reports
              </Typography>
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                label="Business Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
                margin="normal"
                variant="outlined"
                placeholder="billing@yourcompany.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: "#9e9e9e" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "white",
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#333" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#333",
                      borderWidth: 2,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#757575",
                    "&.Mui-focused": { color: "#333" },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                error={Boolean(errors.password)}
                helperText={errors.password}
                margin="normal"
                variant="outlined"
                placeholder="Enter your secure password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#9e9e9e" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "white",
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#333" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#333",
                      borderWidth: 2,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#757575",
                    "&.Mui-focused": { color: "#333" },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 500,
                  textTransform: "none",
                  bgcolor: "#ffd54f",
                  color: "#333",
                  "&:hover": { bgcolor: "#ffca28" },
                  "&:disabled": { bgcolor: "#e0e0e0", color: "#9e9e9e" },
                  mb: 2,
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: "#333" }} />
                ) : (
                  "Login to Billing System"
                )}
              </Button>
            </Box>

            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "#757575" }}>
                {/* Need access to billing software?{" "} */}
                <Link underline="hover" sx={{ color: "#333", fontWeight: 500 }}>
                  {/* Contact system administrator */}
                </Link>
              </Typography>
            </Box>

            <Box sx={{ mt: 6, textAlign: "center" }}>
              <Link
                underline="always"
                sx={{
                  color: "#9e9e9e",
                  fontSize: "0.75rem",
                }}
              >
                {/* Billing Software Terms & Security Policy */}
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Right Image Section */}
      <Box
        sx={{
          display: { xs: "none", lg: "block" },
          width: "50%",
          position: "relative",
          overflow: "hidden",
          bgcolor: "#f5f5f5",
        }}
      >
        <Box
          component="img"
          src={log}
          alt="Billing software dashboard"
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    </Box>
  );
};

export default Login;
