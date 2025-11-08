import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMobile } from './mobile';

// Initialize mobile features if running on native platform
initMobile();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
