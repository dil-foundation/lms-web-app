#!/bin/bash

# Deploy Zoom Integration for DIL LMS
# This script sets up the complete Zoom meetings functionality

echo "🚀 Deploying Zoom Integration for DIL LMS..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Step 1: Running database migrations..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed"
    exit 1
fi

echo "✅ Database migrations completed"

echo "📋 Step 2: Deploying Zoom Meeting Manager Edge Function..."
supabase functions deploy zoom-meeting-manager

if [ $? -ne 0 ]; then
    echo "❌ Edge function deployment failed"
    exit 1
fi

echo "✅ Edge function deployed successfully"

echo "📋 Step 3: Setting up environment variables..."
echo "Please set the following environment variables in your Supabase project:"
echo ""
echo "🔑 Required Environment Variables:"
echo "ZOOM_API_KEY=your_zoom_api_key_here"
echo "ZOOM_API_SECRET=your_zoom_api_secret_here"
echo ""
echo "You can set these in the Supabase Dashboard:"
echo "1. Go to your project dashboard"
echo "2. Navigate to Settings > Edge Functions"
echo "3. Add the environment variables"
echo ""

echo "📋 Step 4: Configuring Zoom Integration..."
echo "To complete the setup, you need to:"
echo ""
echo "1. 📝 Create a Zoom App:"
echo "   - Go to https://marketplace.zoom.us/"
echo "   - Create a new JWT App (for server-to-server authentication)"
echo "   - Get your API Key and API Secret"
echo ""
echo "2. 🔧 Configure Integration in Admin Panel:"
echo "   - Go to Admin Dashboard > Integration APIs"
echo "   - Enable Zoom integration"
echo "   - Enter your API Key and API Secret"
echo "   - Set webhook URL (optional): https://your-project.supabase.co/functions/v1/zoom-meeting-manager"
echo ""
echo "3. ✅ Test the Integration:"
echo "   - Go to Teacher Dashboard > Meetings"
echo "   - Try scheduling a test meeting"
echo ""

echo "🎉 Zoom Integration Deployment Complete!"
echo ""
echo "📚 Features Available:"
echo "✅ Schedule 1-on-1 and class meetings"
echo "✅ Real-time meeting management"
echo "✅ Automatic Zoom meeting creation"
echo "✅ Meeting notifications system"
echo "✅ Comprehensive meeting statistics"
echo "✅ Meeting history and recordings"
echo ""
echo "🔗 Next Steps:"
echo "1. Configure your Zoom API credentials"
echo "2. Test the meeting creation flow"
echo "3. Set up webhook endpoints (optional)"
echo "4. Configure notification preferences"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "https://docs.zoom.us/docs/api/rest/getting-started/"

