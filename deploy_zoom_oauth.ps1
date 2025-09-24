# Deploy the updated Zoom OAuth Edge Function

Write-Host "🚀 Deploying updated Zoom Meeting Manager with OAuth support..." -ForegroundColor Green

# Backup the old function
if (Test-Path "supabase/functions/zoom-meeting-manager/index.ts") {
    Write-Host "📦 Backing up old function..." -ForegroundColor Yellow
    Move-Item "supabase/functions/zoom-meeting-manager/index.ts" "supabase/functions/zoom-meeting-manager/index_jwt_backup.ts"
}

# Replace with OAuth version
Write-Host "🔄 Installing OAuth version..." -ForegroundColor Yellow
Move-Item "supabase/functions/zoom-meeting-manager/index_oauth.ts" "supabase/functions/zoom-meeting-manager/index.ts"

# Deploy to Supabase
Write-Host "📤 Deploying to Supabase..." -ForegroundColor Yellow
Set-Location supabase
npx supabase functions deploy zoom-meeting-manager

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure your Zoom OAuth credentials using configure_zoom_credentials.sql"
Write-Host "2. Replace the placeholder values with your actual Zoom app credentials"
Write-Host "3. Test meeting creation in your Teacher Dashboard"
Write-Host ""
Write-Host "🔗 Get Zoom credentials at: https://marketplace.zoom.us/" -ForegroundColor Blue
