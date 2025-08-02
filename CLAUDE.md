hello# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on port 8080)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, auth, storage)
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router v6
- **Maps**: Mapbox GL JS
- **File Processing**: PDF.js for document parsing

### Application Structure

**RoofMind** is a comprehensive roof inspection and property management platform with three main interfaces:

1. **Unified Dashboard** (`/src/pages/UnifiedDashboard.tsx`) - Main management interface with tabs for:
   - Portfolio overview, roofs, inspections, work orders
   - Clients, contractors, property managers
   - Campaigns, warranties, budgets, maintenance

2. **Inspector Interface** (`/src/pages/InspectorInterface.tsx`) - AI-powered field inspection tool:
   - Pre-inspection intelligence briefings
   - Pattern recognition and historical analysis
   - Voice-to-text notes and photo capture
   - Cross-portfolio insights

3. **Legacy Dashboard** (`/src/pages/Dashboard.tsx`) - Role-based tabbed interface

### Key Architectural Patterns

**Authentication & Authorization**:
- Supabase Auth with role-based access (super_admin, manager, inspector)
- `AuthContext` provides user state and role management
- Row Level Security (RLS) policies in database

**Database Architecture**:
- Complex relational schema centered around `roofs` table
- Inspection campaigns with automated workflow integration
- Comprehensive property metadata and contact management
- Type definitions auto-generated in `/src/integrations/supabase/types.ts`

**Component Organization**:
- `/src/components/ui/` - Reusable shadcn/ui components
- `/src/components/dashboard/` - Tab-specific dashboard components
- `/src/components/inspector/` - Inspector interface components
- `/src/components/auth/` - Authentication components

**State Management**:
- React Query for server state caching and synchronization
- Custom hooks for domain-specific logic (e.g., `useInspectors`, `usePerformanceMonitor`)
- Event-driven architecture with custom event bus (`/src/lib/eventBus.ts`)

**Intelligence Services**:
- `InspectorIntelligenceService` provides AI-powered inspection briefings
- Offline capability with `offlineManager` for field work
- Pattern recognition and cross-portfolio analysis

### Data Flow

1. **Property Management**: Properties stored in `roofs` table with comprehensive metadata
2. **Inspection Campaigns**: Automated workflows via n8n integration
3. **Intelligence Generation**: AI analysis of historical data for inspection preparation
4. **File Management**: Supabase storage for photos, reports, and documents

### Configuration

- **Path aliases**: `@/` maps to `./src`
- **Build system**: Vite with SWC for fast compilation
- **Database**: Supabase with auto-generated TypeScript types
- **Maps**: Mapbox GL (requires API key configuration)

### Key Features

**Inspector Tools**:
- Pre-inspection briefings with AI-generated focus areas
- Historical photo references and pattern analysis
- Voice-to-text field notes
- Offline capability for field work

**Campaign Management**:
- Automated inspection scheduling and communication
- Property grouping with intelligent algorithms
- N8n workflow integration for process automation

**Performance Optimizations**:
- Virtualized lists for large datasets
- Performance monitoring hooks
- Lazy loading and code splitting
- Optimistic updates with React Query

### Accessibility & UX

- Comprehensive keyboard shortcuts for inspector interface
- Screen reader support with announcements
- Responsive design with mobile-first approach
- Progressive Web App capabilities with offline support

## Important Notes

- This is a Lovable.dev project with automatic deployment
- Uses role-based access control - check user permissions before showing features
- Inspector interface has sophisticated keyboard navigation and accessibility features
- Campaign system integrates with external n8n workflows
- Supabase functions handle complex business logic for campaign creation and property analysis

## 🚨 CRITICAL: TooltipProvider Rules for Lovable

### ❌ ABSOLUTELY FORBIDDEN
1. **NEVER** add `<TooltipProvider>` to any component file
2. **NEVER** wrap components in `<TooltipProvider>`
3. **NEVER** import `TooltipProvider` in component files except App.tsx and test-utils.tsx
4. **NEVER** create nested TooltipProvider instances

### ✅ REQUIRED PATTERNS
```tsx
// ✅ CORRECT - Use individual tooltip components
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

function Component() {
  return (
    <Tooltip>
      <TooltipTrigger>Button</TooltipTrigger>
      <TooltipContent>Tooltip text</TooltipContent>
    </Tooltip>
  )
}
```

```tsx
// ❌ FORBIDDEN - Never do this
import { TooltipProvider } from '@/components/ui/tooltip'

function Component() {
  return (
    <TooltipProvider> {/* This will break React */}
      {children}
    </TooltipProvider>
  )
}
```

### 🚨 Error Recognition
If you see these errors, it means nested TooltipProvider was added:
- `TypeError: null is not an object (evaluating 'dispatcher.useState')`
- `Invalid hook call`
- `Hooks can only be called inside the body of a function component`

### 🛠️ Required Fix
1. Search for `TooltipProvider` in all files
2. Remove any TooltipProvider outside of `src/App.tsx` and `src/test/utils/test-utils.tsx`
3. Use only individual tooltip components

### 📍 Allowed TooltipProvider Locations
- `src/App.tsx` - Global provider (REQUIRED)
- `src/test/utils/test-utils.tsx` - Test provider (REQUIRED)
- `src/components/ui/tooltip.tsx` - Export only (NO USAGE)

### 🛡️ Automated Protection
The project includes automatic detection:
- Development runtime checks catch violations
- Build-time validation prevents deployment
- ESLint rules warn about improper usage

**FAILURE TO FOLLOW THESE RULES WILL BREAK THE APPLICATION**

## Claude Code Agent Integration

### Three-Agent Speed System
The RoofGuardian platform now uses an optimized 3-agent system designed for Lovable-speed development with Claude Code:

1. **Code Orchestrator Agent**: Multi-file development with <30 second response times
2. **Visual Development Agent**: Playwright-powered visual validation with immediate feedback
3. **Context Intelligence Agent**: Perfect project memory and pattern learning

### Required MCP Servers
Essential for optimal performance:
- **@anthropic/mcp-github**: Repository management, branching, commits, PR creation
- **@anthropic/mcp-playwright**: Visual testing, screenshot capture, mobile validation
- **@anthropic/mcp-memory**: Context intelligence, pattern storage, learning systems
- **@anthropic/mcp-filesystem**: Multi-file editing, rapid component generation
- **@anthropic/mcp-commands**: Build processes, dev server management, testing

Optional but recommended:
- **@anthropic/mcp-supabase**: Database-aware optimizations
- **@anthropic/mcp-web-search**: Documentation and troubleshooting

### Development Workflow with Claude Code
1. **Natural Language Prompt**: Simply describe what you want
   - Example: "Make the inspection form more mobile-friendly"
2. **Rapid Agent Collaboration**: All three agents work together in 2-3 minute cycles
3. **Visual Validation**: Immediate screenshots and testing feedback
4. **Automatic Git Operations**: Branches, commits, and PRs created automatically
5. **Context Preservation**: Every decision and pattern learned for future iterations

### Speed Targets
- **Time to First Visual**: <30 seconds after prompt
- **Complete Iteration Cycle**: 2-3 minutes
- **Error Recovery**: <1 minute
- **Context Retrieval**: <5 seconds

### RoofGuardian-Specific Optimizations
- **Construction Industry Patterns**: Pre-built inspection workflow components
- **Mobile-First Development**: Touch-friendly interfaces optimized for field workers
- **Offline Capability**: Progressive sync and local storage strategies
- **Performance at Scale**: Optimized for 10K+ property portfolios
- **Supabase Integration**: Database-aware code generation and optimization

### Usage Examples
Instead of complex agent commands, use natural language:
- "Optimize the property loading performance"
- "Add offline sync to the photo upload feature" 
- "Fix any TypeScript errors in the inspection components"
- "Make the dashboard more responsive on tablets"
- "Improve the accessibility of form inputs"

The system automatically selects optimal agents and coordination patterns based on the request.