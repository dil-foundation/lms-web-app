#!/bin/bash

# Test Build Script for LMS Web App
# This script helps test the build process locally before deployment

set -e

echo "🚀 Starting LMS Web App build test..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found. Using default values."
    echo "   Create .env.local with your environment variables for proper testing."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build:prod

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output: dist/"
    echo "📊 Build size:"
    du -sh dist/
    echo ""
    echo "🔍 Build contents:"
    ls -la dist/
else
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo ""
echo "🎉 Build test completed successfully!"
echo "💡 Next steps:"
echo "   1. Test the built application locally: npm run preview"
echo "   2. Deploy to S3 using GitHub Actions"
echo "   3. Or deploy manually: aws s3 sync dist/ s3://your-bucket-name --delete"
