import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/monitoring/ErrorBoundary'
import './index.css'
import './register-sw'

// Initialize environment debugging and TooltipProvider protection in development
if (import.meta.env.DEV) {
  // Debug environment variables first
  import('./lib/envDebugger').then(() => {
    console.log('🔧 Environment debugging complete');
  });
  
  import('./lib/tooltipProtection').then(({ initTooltipProtection }) => {
    initTooltipProtection();
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary componentName="Main">
    <App />
  </ErrorBoundary>
);
