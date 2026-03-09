import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div>
      <Outlet /> {/* just renders login page */}
    </div>
  );
};

export default AuthLayout;
