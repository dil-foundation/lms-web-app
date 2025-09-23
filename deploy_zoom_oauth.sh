#!/bin/bash

# Deploy the updated Zoom OAuth Edge Function

echo "🚀 Deploying updated Zoom Meeting Manager with OAuth support..."

# Backup the old function
if [ -f "supabase/functions/zoom-meeting-manager/index.ts" ]; then
    echo "📦 Backing up old function..."
    mv supabase/functions/zoom-meeting-manager/index.ts supabase/functions/zoom-meeting-manager/index_jwt_backup.ts
fi

# Replace with OAuth version
echo "🔄 Installing OAuth version..."
mv supabase/functions/zoom-meeting-manager/index_oauth.ts supabase/functions/zoom-meeting-manager/index.ts

# Deploy to Supabase
echo "📤 Deploying to Supabase..."
cd supabase
npx supabase functions deploy zoom-meeting-manager

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your Zoom OAuth credentials using configure_zoom_credentials.sql"
echo "2. Replace the placeholder values with your actual Zoom app credentials"
echo "3. Test meeting creation in your Teacher Dashboard"
echo ""
echo "🔗 Get Zoom credentials at: https://marketplace.zoom.us/"
