import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/animations.css";
import "./styles/home.css";
import "./styles/login.css";
import "./styles/recipes.css";
import "./styles/connect.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
