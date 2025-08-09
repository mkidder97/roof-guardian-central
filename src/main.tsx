import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './register-sw'

// Initialize TooltipProvider protection in development
if (import.meta.env.DEV) {
  import('./lib/tooltipProtection').then(({ initTooltipProtection }) => {
    initTooltipProtection();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
