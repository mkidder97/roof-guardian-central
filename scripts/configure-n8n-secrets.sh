#!/bin/bash

# Script to configure n8n edge function secrets in Supabase
# Run this from the project root directory

echo "🔧 Configuring n8n Edge Function Secrets"
echo "========================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Prompt for values
echo ""
echo "Please provide the following values:"
echo ""

read -p "N8N Webhook Base URL (e.g., https://mkidder97.app.n8n.cloud/webhook): " N8N_WEBHOOK_BASE
read -p "N8N Shared Secret (generate a strong random string): " N8N_SHARED_SECRET

# Validate inputs
if [ -z "$N8N_WEBHOOK_BASE" ] || [ -z "$N8N_SHARED_SECRET" ]; then
    echo "❌ Both values are required. Please run the script again."
    exit 1
fi

# Set the secrets
echo ""
echo "🔄 Setting secrets in Supabase..."

supabase secrets set N8N_WEBHOOK_BASE="$N8N_WEBHOOK_BASE"
supabase secrets set N8N_SHARED_SECRET="$N8N_SHARED_SECRET"

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy your edge functions: supabase functions deploy"
echo "2. Test the workflow connectivity:"
echo "   - Open your app in the browser"
echo "   - Open the console (F12)"
echo "   - Run: testN8nWorkflows.testProxy()"
echo ""
echo "🔐 Security reminder: Keep your N8N_SHARED_SECRET secure and don't commit it to git"