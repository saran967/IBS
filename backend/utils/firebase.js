// import admin from "firebase-admin";
// import ismath from "../ismath.json" with { type: "json" };

// admin.initializeApp({
//   credential: admin.credential.cert(ismath),
// });

// export default admin;

import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ismath = require("../ismath.json");

admin.initializeApp({
  credential: admin.credential.cert(ismath),
});

export default admin;
