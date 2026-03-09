import { Box, CircularProgress, Typography } from "@mui/material";
import storage from "../../assets/images/storage.png";
const FullScreenLoader = () => {
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F8FAFF",
      }}
    >
      <img
        src={storage} // optional branding
        alt="App Logo"
        style={{ width: 180, marginBottom: 20 }}
      />

      <CircularProgress size={42} sx={{ mb: 2 }} />
      <Typography variant="body1" sx={{ color: "#666" }}>
        Checking session...
      </Typography>
    </Box>
  );
};

export default FullScreenLoader;