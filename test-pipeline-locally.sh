#!/bin/bash

# Local Pipeline Test Script
# This script simulates the GitHub Actions pipeline locally for testing

set -e  # Exit on any error

echo "🧪 Testing GitHub Actions Pipeline Locally"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Step 1: Checking Node.js and npm"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

print_step "Step 2: Installing dependencies"
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_step "Step 3: Checking for environment file"
if [ -f ".env.production" ]; then
    print_success ".env.production file exists"
    
    # Check for required variables
    if grep -q "VITE_SUPABASE_URL=" .env.production; then
        SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env.production | cut -d'=' -f2- | tr -d '"')
        if [ "$SUPABASE_URL" != "" ] && [ "$SUPABASE_URL" != "YOUR_ACTUAL_ANON_KEY_HERE" ]; then
            print_success "VITE_SUPABASE_URL is configured"
        else
            print_warning "VITE_SUPABASE_URL needs to be updated with actual value"
        fi
    else
        print_warning "VITE_SUPABASE_URL not found in .env.production"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY=" .env.production; then
        SUPABASE_KEY=$(grep "VITE_SUPABASE_ANON_KEY=" .env.production | cut -d'=' -f2- | tr -d '"')
        if [ "$SUPABASE_KEY" != "" ] && [ "$SUPABASE_KEY" != "YOUR_ACTUAL_ANON_KEY_HERE" ]; then
            print_success "VITE_SUPABASE_ANON_KEY is configured"
        else
            print_warning "VITE_SUPABASE_ANON_KEY needs to be updated with actual value"
        fi
    else
        print_warning "VITE_SUPABASE_ANON_KEY not found in .env.production"
    fi
    
    echo ""
    print_step "Environment file contents (redacted):"
    sed 's/=.*/=***REDACTED***/g' .env.production
    echo ""
else
    print_warning ".env.production file not found"
    echo "Run './setup-env.sh' to create it, then edit with your actual credentials"
fi

print_step "Step 4: Testing build process"
echo "Running: npm run build:prod"
if npm run build:prod; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

print_step "Step 5: Verifying build output"
if [ -d "dist" ]; then
    print_success "dist directory created"
    
    if [ -f "dist/index.html" ]; then
        print_success "index.html found in dist"
    else
        print_error "index.html not found in dist"
        exit 1
    fi
    
    # Build statistics
    BUILD_SIZE=$(du -sh dist/ | cut -f1)
    ASSET_COUNT=$(find dist/ -type f -name "*.js" -o -name "*.css" -o -name "*.html" | wc -l)
    
    print_success "Build size: $BUILD_SIZE"
    print_success "Total assets: $ASSET_COUNT files"
    
    echo ""
    print_step "Build contents:"
    ls -la dist/
    
else
    print_error "dist directory not found"
    exit 1
fi

print_step "Step 6: Testing preview server (optional)"
echo "You can test the built application by running:"
echo "  npm run preview"
echo ""

print_step "Step 7: AWS CLI Check (for deployment)"
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | head -n1)
    print_success "AWS CLI available: $AWS_VERSION"
    
    # Check if AWS is configured
    if aws sts get-caller-identity &> /dev/null; then
        print_success "AWS credentials are configured"
    else
        print_warning "AWS credentials not configured (needed for deployment)"
        echo "Run: aws configure"
    fi
else
    print_warning "AWS CLI not installed (needed for S3 deployment)"
    echo "Install from: https://aws.amazon.com/cli/"
fi

echo ""
echo "🎉 Local Pipeline Test Summary"
echo "=============================="

if [ -f ".env.production" ] && [ -d "dist" ] && [ -f "dist/index.html" ]; then
    print_success "✅ All checks passed! Your pipeline should work correctly."
    echo ""
    echo "📋 Next steps:"
    echo "1. Ensure all GitHub secrets are configured (see GITHUB_SECRETS_SETUP_GUIDE.md)"
    echo "2. Push your changes to trigger the GitHub Actions pipeline"
    echo "3. Monitor the pipeline execution in the Actions tab"
else
    print_warning "⚠️  Some issues found. Please address them before running the pipeline."
fi

echo ""
echo "📚 Helpful commands:"
echo "• Test locally: ./test-pipeline-locally.sh"
echo "• Setup environment: ./setup-env.sh"
echo "• Build for production: npm run build:prod"
echo "• Preview build: npm run preview"
echo "• Deploy manually: aws s3 sync dist/ s3://your-bucket-name --delete"

echo ""
print_step "Test completed!"

