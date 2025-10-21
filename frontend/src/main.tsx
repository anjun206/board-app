import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import PostDetail from "./PostDetail";
import MyWidget from "./components/MyWidget";
import { ConfirmProvider } from "./components/ConfirmProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ConfirmProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/demo/cassette" element={<MyWidget />} />
      </Routes>
    </BrowserRouter>
  </ConfirmProvider>
);
