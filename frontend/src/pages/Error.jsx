import { Link, useRouteError } from "react-router-dom";

const Error = () => {
  return (
    <div>
      <h3> Something Went Wrong</h3>
      <Link to="/">Back Home</Link>
    </div>
  );
};

export default Error;
