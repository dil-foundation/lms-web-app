#!/bin/bash

# Environment Setup Script for LMS Web App
# This script creates the necessary environment files for building the application

echo "🚀 Setting up environment variables for LMS Web App..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create .env.production if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "📝 Creating .env.production file..."
    cat > .env.production << 'EOF'
# Production Environment Variables
# IMPORTANT: Replace these with your actual Supabase credentials

VITE_SUPABASE_URL="https://yfaiauooxwvekdimfeuu.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYWlhdW9veHd2ZWtkaW1mZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzQ4MDAsImV4cCI6MjA1MTU1MDgwMH0.YOUR_ACTUAL_ANON_KEY_HERE"
VITE_API_BASE_URL="https://your-api-url.com"

# Optional: Add other environment variables as needed
# VITE_OPENAI_API_KEY=""
# VITE_FIREBASE_CONFIG=""
EOF
    echo "✅ Created .env.production"
else
    echo "ℹ️  .env.production already exists"
fi

# Create .env.development if it doesn't exist
if [ ! -f ".env.development" ]; then
    echo "📝 Creating .env.development file..."
    cat > .env.development << 'EOF'
# Development Environment Variables
# IMPORTANT: Replace these with your actual Supabase credentials

VITE_SUPABASE_URL="https://yfaiauooxwvekdimfeuu.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYWlhdW9veHd2ZWtkaW1mZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzQ4MDAsImV4cCI6MjA1MTU1MDgwMH0.YOUR_ACTUAL_ANON_KEY_HERE"
VITE_API_BASE_URL="http://localhost:8000"

# Development specific variables
VITE_DEBUG_MODE="true"
EOF
    echo "✅ Created .env.development"
else
    echo "ℹ️  .env.development already exists"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Edit .env.production and .env.development with your actual Supabase credentials"
echo "2. Replace 'YOUR_ACTUAL_ANON_KEY_HERE' with your real anon key"
echo "3. Update VITE_SUPABASE_URL if different"
echo "4. Run 'npm run build:prod' to build for production"
echo ""
echo "📋 Environment files created:"
echo "   - .env.production (for production builds)"
echo "   - .env.development (for development builds)"
echo ""
echo "⚠️  IMPORTANT: Never commit these files to version control!"
echo "   They are already in .gitignore"

# Check if files are properly ignored
if grep -q ".env.production" .gitignore && grep -q ".env.development" .gitignore; then
    echo "✅ Environment files are properly ignored in .gitignore"
else
    echo "⚠️  Warning: Environment files might not be in .gitignore"
fi

echo ""
echo "🎯 To fix the 'Invalid API key' error:"
echo "   1. Get your Supabase project URL and anon key from https://supabase.com/dashboard"
echo "   2. Edit .env.production with the correct values"
echo "   3. Run: npm run build:prod"
echo "   4. Deploy the dist/ folder to S3"

