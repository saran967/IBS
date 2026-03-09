import { Breadcrumbs as MUIBreadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <MUIBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link component={RouterLink} underline="hover" color="inherit" to="/">
        Home
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;

        return isLast ? (
          <Typography key={to} color="text.primary">
            {value.replace(/-/g, " ").toUpperCase()}
          </Typography>
        ) : (
          <Link
            key={to}
            component={RouterLink}
            underline="hover"
            color="inherit"
            to={to}
          >
            {value.replace(/-/g, " ").toUpperCase()}
          </Link>
        );
      })}
    </MUIBreadcrumbs>
  );
}
