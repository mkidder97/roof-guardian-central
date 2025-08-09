/**
 * Environment Variable Debugging Utility
 * Helps diagnose environment variable loading issues
 */

export function debugEnvironmentVariables() {
  console.group('🔧 Environment Variables Debug');
  
  // Check all Vite environment variables
  const viteEnvVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
  console.log('📋 Available VITE_ variables:', viteEnvVars);
  
  // Check specific required variables
  const requiredVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_USE_SUPABASE_PROXY: import.meta.env.VITE_USE_SUPABASE_PROXY,
    VITE_N8N_WEBHOOK_BASE: import.meta.env.VITE_N8N_WEBHOOK_BASE
  };
  
  console.log('🔍 Required variables status:');
  Object.entries(requiredVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const preview = value ? `${String(value).substring(0, 20)}...` : 'MISSING';
    console.log(`  ${status} ${key}: ${preview}`);
  });
  
  // Check environment mode
  console.log('🌍 Environment info:', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    ssr: import.meta.env.SSR
  });
  
  // Check for common issues
  const issues = [];
  if (!import.meta.env.VITE_SUPABASE_URL) {
    issues.push('VITE_SUPABASE_URL is missing');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    issues.push('VITE_SUPABASE_ANON_KEY is missing');
  }
  if (viteEnvVars.length === 0) {
    issues.push('No VITE_ environment variables found at all - .env file may not be loading');
  }
  
  if (issues.length > 0) {
    console.error('❌ Issues found:', issues);
    console.error('💡 Troubleshooting tips:');
    console.error('  1. Check that .env file exists in project root');
    console.error('  2. Restart development server after adding .env');
    console.error('  3. Verify environment variables start with VITE_');
    console.error('  4. Check for syntax errors in .env file');
  } else {
    console.log('✅ All required environment variables are present');
  }
  
  console.groupEnd();
}

// Auto-run in development mode
if (import.meta.env.DEV) {
  debugEnvironmentVariables();
}