import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
// Shop experience layer — header search, cards, product, checkout, account.
// Imported after styles.css so it can refine the shared primitives.
import "./styles-shop.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
