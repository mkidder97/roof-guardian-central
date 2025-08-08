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
  
  // Load n8n workflow test functions
  import('./lib/testN8nWorkflows').then(() => {
    console.log('🧪 n8n workflow test functions loaded - use testN8nWorkflows.runTests()');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
