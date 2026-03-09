import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import Sidebar from "../components/Admin/Sidebar";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { Box, useMediaQuery } from "@mui/material";
import Topbar from "../components/Admin/TopBar";
import { useState, useEffect } from "react";

const DashBoardOulet = () => {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");

  const navigate = useNavigate();
  const location = useLocation();

  //  GLOBAL F1, F2 SHORTCUT
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        navigate(location.pathname.replace(/^\/(en|ta|both)/, "/ta"));
      }

      if (e.key === "F2") {
        e.preventDefault();
        navigate(location.pathname.replace(/^\/(en|ta|both)/, "/en"));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate, location]);

  return (
    <LanguageProvider>
      <Box
        sx={{
          display: "flex",
          width: "100vw",
          maxWidth: "100vw",
          overflowX: "auto",
          height: "100vh",
        }}
      >
        <Sidebar open={open} setOpen={setOpen} />

        <Box
          sx={{
            flexGrow: 1,
            width: "100%",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <Topbar open={open} setOpen={setOpen} />
          <Box
            sx={{
              p: { xs: 1.5, sm: 2, md: 1 },
              mt: { xs: 7, sm: 8, md: 9 },
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowX: "auto",
            }}
          >
            {/* <LanguageSwitcher /> */}

            <Outlet />
          </Box>
        </Box>
      </Box>
    </LanguageProvider>
  );
};

export default DashBoardOulet;
