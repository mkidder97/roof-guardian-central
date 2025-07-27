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
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(process.env.GITHUB_SHA || Date.now().toString()),
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
