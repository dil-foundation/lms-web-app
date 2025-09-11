#!/bin/bash

# IRIS Deployment Script
# This script deploys the complete IRIS system

echo "🚀 Starting IRIS deployment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
echo "🔐 Checking Supabase authentication..."
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

echo "✅ Supabase CLI ready"

# Deploy the database migration
echo "📊 Applying database migration..."
if supabase db push; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Deploy the Edge Function
echo "🔧 Deploying IRIS chat function..."
if supabase functions deploy iris-chat; then
    echo "✅ IRIS chat function deployed successfully"
else
    echo "❌ Function deployment failed"
    exit 1
fi

# Check function status
echo "🔍 Checking function status..."
supabase functions list

echo ""
echo "🎉 IRIS deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Supabase dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - MCP_ADAPTER_URL"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Test the implementation:"
echo "   - Navigate to /dashboard/iris"
echo "   - Try asking: 'Show me all students'"
echo ""
echo "3. Monitor the logs:"
echo "   supabase functions logs iris-chat"
echo ""
echo "📖 For detailed setup instructions, see IRIS_DEPLOYMENT_GUIDE.md"
echo ""
echo "🚀 IRIS is ready to provide AI-powered database insights!"
