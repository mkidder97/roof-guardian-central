# CLAUDE.md

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