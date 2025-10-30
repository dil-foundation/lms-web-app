# Script to apply the infinite reload fix
Write-Host "🔧 Applying Infinite Reload Fix..." -ForegroundColor Cyan

# Stop any running dev server
Write-Host "`n📛 Stopping any running dev servers..." -ForegroundColor Yellow
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Stop-Process -Force
    Write-Host "✅ Stopped running dev servers" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No running dev servers found" -ForegroundColor Gray
}

Write-Host "`n🧹 Clearing browser cache and service worker..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please follow these steps to complete the fix:" -ForegroundColor Cyan
Write-Host "1. Open your browser Developer Tools (F12)" -ForegroundColor White
Write-Host "2. Go to Application tab → Service Workers" -ForegroundColor White
Write-Host "3. Click 'Unregister' on any registered service workers" -ForegroundColor White
Write-Host "4. Go to Application tab → Storage" -ForegroundColor White
Write-Host "5. Click 'Clear site data'" -ForegroundColor White
Write-Host "6. Close all browser tabs for this app" -ForegroundColor White
Write-Host "7. Press Enter to restart the dev server..." -ForegroundColor Yellow
Read-Host

Write-Host "`n🚀 Starting dev server..." -ForegroundColor Cyan
npm run dev

Write-Host "`n✅ Fix applied! The app should no longer reload infinitely." -ForegroundColor Green
Write-Host "ℹ️ Check the console for service worker messages." -ForegroundColor Gray


