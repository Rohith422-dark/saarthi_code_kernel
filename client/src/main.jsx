import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AppProvider } from './context/AppContext';
import { LangProvider } from './i18n';
import { TooltipProvider } from './components/ui/overlay';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
      <AppProvider>
        <TooltipProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: { background: '#fff', color: '#172D3B', border: '1px solid #DCE5EA', borderRadius: 10, fontSize: 13.5, boxShadow: '0 8px 24px -6px rgba(23,45,59,.14)' },
              success: { iconTheme: { primary: '#0F766E', secondary: '#fff' } },
              error: { iconTheme: { primary: '#B91C1C', secondary: '#fff' } },
            }}
          />
        </TooltipProvider>
      </AppProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
