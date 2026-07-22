import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AgencePage from "./pages/AgencePage";
import RecherchePage from "./pages/RecherchePage";
import "./styles/index.css";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agences" element={<AgencePage />} />
          <Route path="/recherche" element={<RecherchePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;