// import React from "react";
// import { Box, Divider } from "@mui/material";
// import PermissionManagement from "../pages/PermissionManagement";
// import PermissionList from "./PermissionList";

// const PermissionPage = () => {
//   return (
//     <Box sx={{ p: 3 }}>
//       {/* Permission Assign Form */}
//       <PermissionManagement />

//       <Divider sx={{ my: 4 }} />

//       {/* User Permission List */}
//       <PermissionList />
//     </Box>
//   );
// };

// export default PermissionPage;


import React, { useState } from "react";
import { Box, Divider } from "@mui/material";
import PermissionManagement from "../pages/PermissionManagement";
import PermissionList from "./PermissionList";

const PermissionPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <PermissionManagement onDataUpdated={() => setRefreshKey(prev => prev + 1)} />

      <Divider sx={{ my: 4 }} />

      <PermissionList refreshKey={refreshKey} />
    </Box>
  );
};

export default PermissionPage;
