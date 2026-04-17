import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ShadowingDashboard from './pages/ShadowingDashboard';
import KeywordEncyclopedia from './pages/KeywordEncyclopedia';
import KeywordCalendar from './pages/KeywordCalendar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="shadowing" element={<ShadowingDashboard />} />
          <Route path="encyclopedia" element={<KeywordEncyclopedia />} />
          <Route path="calendar" element={<KeywordCalendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
