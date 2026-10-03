import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import SharedPlan from "./SharedPlan.jsx";
import "./styles.css";

// Two entry points on one bundle: /p/<id> is the public view of a saved plan; everything
// else is the (password-gated) designer.
const shared = location.pathname.match(/^\/p\/([A-Za-z0-9_-]{16,40})\/?$/);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {shared ? <SharedPlan id={shared[1]} /> : <App />}
  </React.StrictMode>
);
