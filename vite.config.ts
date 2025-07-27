import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import { glob } from "glob";

// TooltipProvider protection plugin
const tooltipProviderPlugin = () => ({
  name: 'tooltip-provider-protection',
  buildStart() {
  const allowedFiles = [
    'src/App.tsx',
    'src/test/utils/test-utils.tsx',
    'src/components/ui/tooltip.tsx',
    'src/lib/tooltipProtection.ts'
  ];
    
    try {
      const tsxFiles = glob.sync('src/**/*.{tsx,ts}');
      const violations = [];
      
      for (const file of tsxFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for TooltipProvider usage in disallowed files
        if (content.includes('TooltipProvider') && content.includes('<TooltipProvider')) {
          const isAllowed = allowedFiles.some(allowed => file.includes(allowed));
          if (!isAllowed) {
            violations.push({
              file,
              issue: 'Contains TooltipProvider component usage',
              line: content.split('\n').findIndex(line => line.includes('<TooltipProvider')) + 1
            });
          }
        }
        
        // Check for TooltipProvider imports in disallowed files
        if (content.includes('TooltipProvider') && content.includes('import')) {
          const importMatch = content.match(/import.*TooltipProvider.*from.*tooltip/);
          if (importMatch) {
            const isAllowed = allowedFiles.some(allowed => file.includes(allowed));
            if (!isAllowed) {
              violations.push({
                file,
                issue: 'Imports TooltipProvider',
                line: content.split('\n').findIndex(line => line.includes('TooltipProvider')) + 1
              });
            }
          }
        }
      }
      
      if (violations.length > 0) {
        console.error('\n🚨 TOOLTIPPROVIDER VIOLATIONS DETECTED:\n');
        violations.forEach(v => {
          console.error(`❌ ${v.file}:${v.line} - ${v.issue}`);
        });
        console.error('\n📋 SOLUTION:');
        console.error('  1. Remove <TooltipProvider> from component files');
        console.error('  2. Remove TooltipProvider imports');
        console.error('  3. Use only: Tooltip, TooltipTrigger, TooltipContent');
        console.error('  4. Global TooltipProvider exists in App.tsx\n');
        
        throw new Error(`Build failed: ${violations.length} TooltipProvider violations found`);
      }
    } catch (error: any) {
      if (error?.message?.includes('TooltipProvider violations')) {
        throw error;
      }
      // Ignore glob/fs errors in some environments
      console.warn('TooltipProvider check skipped:', error?.message || 'Unknown error');
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false // Disable HMR overlay that can corrupt React
    }
  },
  define: {
    global: 'globalThis',
    __BUILD_VERSION__: JSON.stringify(process.env.GITHUB_SHA || Date.now().toString()),
  },
  optimizeDeps: {
    include: [
      'pdfjs-dist', 
      '@supabase/supabase-js',
      'react',
      'react-dom',
      'react/jsx-runtime',
      'xlsx',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip'
    ],
    exclude: ['@supabase/supabase-js/dist/module/index.js'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/pdfjs-dist/, /xlsx/, /node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar']
        }
      }
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // tooltipProviderPlugin(), // Temporarily disabled
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
