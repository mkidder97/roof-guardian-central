import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './register-sw'

// Initialize TooltipProvider protection in development
if (import.meta.env.DEV) {
  import('./lib/tooltipProtection').then(({ initTooltipProtection }) => {
    initTooltipProtection();
  });
  
  // Load n8n test utilities
  import('./lib/manualN8nTrigger').then(() => {
    console.log('n8n test utilities loaded - check console for commands');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
