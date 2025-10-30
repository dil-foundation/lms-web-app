#!/bin/bash

# Script to apply the infinite reload fix
echo "🔧 Applying Infinite Reload Fix..."

# Stop any running dev server
echo ""
echo "📛 Stopping any running dev servers..."
if pgrep -f "vite" > /dev/null; then
    pkill -f "vite"
    echo "✅ Stopped running dev servers"
else
    echo "ℹ️ No running dev servers found"
fi

echo ""
echo "🧹 Clearing browser cache and service worker..."
echo ""
echo "Please follow these steps to complete the fix:"
echo "1. Open your browser Developer Tools (F12)"
echo "2. Go to Application tab → Service Workers"
echo "3. Click 'Unregister' on any registered service workers"
echo "4. Go to Application tab → Storage"
echo "5. Click 'Clear site data'"
echo "6. Close all browser tabs for this app"
echo "7. Press Enter to restart the dev server..."
read

echo ""
echo "🚀 Starting dev server..."
npm run dev

echo ""
echo "✅ Fix applied! The app should no longer reload infinitely."
echo "ℹ️ Check the console for service worker messages."


