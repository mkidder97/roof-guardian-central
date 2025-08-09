# Environment Variables Configuration

## Overview
This document explains how to properly configure environment variables for the RoofMind application.

## Required Environment Variables

### Supabase Configuration (Required)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### n8n Integration (Optional)
```bash
VITE_USE_SUPABASE_PROXY=true
VITE_N8N_WEBHOOK_BASE=https://your-n8n-instance.app.n8n.cloud/webhook
```

### Optional Features
```bash
VITE_WS_ENABLED=false
VITE_SENTRY_DSN=
```

## Environment File Setup

### 1. Primary Environment File (`.env`)
This file is automatically loaded by Vite in all environments:

```bash
# .env
VITE_SUPABASE_URL=https://cycfmmxveqcpqtmncmup.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_USE_SUPABASE_PROXY=true
VITE_N8N_WEBHOOK_BASE=https://mkidder97.app.n8n.cloud/webhook
```

### 2. Local Development Override (`.env.local`)
Optional file for local development overrides (gitignored):

```bash
# .env.local  
VITE_USE_SUPABASE_PROXY=false  # Test direct calls locally
```

## Troubleshooting Environment Variables

### Common Issues

1. **"supabaseUrl is required" Error**
   - **Cause**: Environment variables not loading properly
   - **Solution**: 
     - Ensure `.env` file exists in project root
     - Restart development server: `npm run dev`
     - Check that variables start with `VITE_`

2. **Variables Are Undefined**
   - **Check**: Open browser console and look for environment debugging output
   - **Debug**: The app automatically logs environment variable status in dev mode

3. **App Shows Blank Screen**
   - **Likely Cause**: Missing or malformed environment variables
   - **Solution**: Check browser console for detailed error messages

### Debugging Tools

The application includes automatic environment variable debugging:

1. **Browser Console Logging**
   ```
   🔧 Supabase Environment Variables: {
     hasUrl: true,
     hasKey: true,
     urlPreview: "https://cycfmmxveqcpqtmn...",
     allEnvVars: ["VITE_SUPABASE_URL", ...]
   }
   ```

2. **Error Boundary**
   - Catches environment variable errors
   - Shows user-friendly error messages
   - Provides troubleshooting tips

3. **Manual Debugging**
   ```javascript
   // In browser console
   console.log('Environment variables:', import.meta.env)
   ```

### Environment Variable Loading Order

Vite loads environment variables in this order:
1. `.env.local` (local development overrides)
2. `.env.development.local` (development mode local)
3. `.env.development` (development mode)
4. `.env` (all environments)

## Security Notes

1. **Never commit sensitive keys** to version control
2. **Use `.env.local`** for sensitive local development values
3. **Rotate keys** if accidentally exposed
4. **Environment variables starting with `VITE_`** are exposed to the client

## Deployment Considerations

### Lovable Platform
- Lovable automatically loads `.env` files
- Ensure `.env` file is committed to the repository
- Local `.env.local` files are ignored

### Other Platforms
- Set environment variables in platform-specific configuration
- Ensure all `VITE_*` variables are available at build time

## Validation

The application automatically validates required environment variables at startup and will show detailed error messages if any are missing or malformed.