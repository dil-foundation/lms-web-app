# LMS Web App - Deployment Guide

This document provides comprehensive instructions for setting up automated deployment of the LMS Web App to AWS S3 using GitHub Actions.

## Overview

The deployment pipeline automatically builds and deploys the React + Vite application to an S3 bucket when changes are pushed to the `main` branch. The workflow includes:

- ✅ Automated builds on push to `main` and `develop` branches
- ✅ Linting and code quality checks
- ✅ Production build with environment variables
- ✅ S3 deployment with proper caching headers
- ✅ CloudFront cache invalidation (optional)
- ✅ Build artifact management

## Prerequisites

### 1. AWS Account Setup

You'll need an AWS account with the following resources:

- **S3 Bucket**: For hosting the static website
- **IAM User**: With permissions to upload to S3 and invalidate CloudFront
- **CloudFront Distribution** (optional): For CDN and custom domain

### 2. GitHub Repository Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for deployment | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `S3_BUCKET_NAME` | Name of your S3 bucket | `my-lms-app-bucket` |

#### Environment Variables (for build)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.myapp.com` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://yfaiauooxwvekdimfeuu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSyB...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `myapp.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `myapp-12345` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `myapp-12345.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123456789:web:abc123` |
| `VITE_OPENAI_API_KEY` | OpenAI API key for AI features | `sk-...` |

#### Optional Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID for cache invalidation | `E1234567890ABC` |

## AWS Setup Instructions

### 1. Create S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://your-lms-app-bucket

# Enable static website hosting
aws s3 website s3://your-lms-app-bucket --index-document index.html --error-document index.html

# Set bucket policy for public read access
aws s3api put-bucket-policy --bucket your-lms-app-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-lms-app-bucket/*"
    }
  ]
}'
```

### 2. Create IAM User

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-lms-app-bucket",
        "arn:aws:s3:::your-lms-app-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. CloudFront Setup (Optional)

If you want to use CloudFront for CDN and custom domain:

1. Create a CloudFront distribution
2. Set the origin to your S3 bucket
3. Configure custom error pages (404 → index.html for SPA routing)
4. Add the distribution ID to GitHub secrets

## GitHub Actions Workflow

The workflow file is located at `.github/workflows/deploy.yml` and includes:

### Build Job
- Installs dependencies with `npm ci`
- Runs linting with `npm run lint`
- Builds the application with `npm run build:prod`
- Uploads build artifacts

### Deploy Job
- Downloads build artifacts
- Configures AWS credentials
- Syncs files to S3 with proper caching headers
- Invalidates CloudFront cache (if configured)

## Caching Strategy

The deployment sets appropriate cache headers:

- **Static assets** (JS, CSS, images): 1 year cache
- **HTML files**: No cache (immediate updates)
- **Service worker**: No cache (immediate updates)

## Environment-Specific Builds

The workflow supports different build modes:

- **Production**: `npm run build:prod` (default for main branch)
- **Development**: `npm run build:dev` (for develop branch)

## Monitoring and Troubleshooting

### Build Logs
- Check GitHub Actions tab for build logs
- Look for any environment variable issues
- Verify AWS credentials and permissions

### Common Issues

1. **Build fails due to missing environment variables**
   - Ensure all required secrets are set in GitHub
   - Check that secret names match exactly

2. **S3 upload fails**
   - Verify AWS credentials are correct
   - Check S3 bucket permissions
   - Ensure bucket name is correct

3. **CloudFront invalidation fails**
   - Verify CloudFront distribution ID is correct
   - Check IAM permissions for CloudFront

### Deployment URLs

After successful deployment, your app will be available at:

- **S3 Website URL**: `https://your-bucket-name.s3-website-us-east-1.amazonaws.com`
- **CloudFront URL** (if configured): `https://your-distribution-id.cloudfront.net`

## Local Development

For local development, create a `.env.local` file with the same environment variables:

```bash
# .env.local
VITE_API_BASE_URL=https://api.myapp.com
VITE_SUPABASE_URL=https://yfaiauooxwvekdimfeuu.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# ... other variables
```

## Security Considerations

1. **Never commit environment variables** to the repository
2. **Use least-privilege IAM policies** for deployment
3. **Rotate AWS credentials** regularly
4. **Monitor CloudTrail logs** for unusual activity
5. **Use HTTPS** for all external services

## Support

For issues with deployment:

1. Check the GitHub Actions logs
2. Verify all secrets are correctly set
3. Test AWS credentials manually
4. Review S3 bucket permissions

## Next Steps

1. Set up the required GitHub secrets
2. Configure your S3 bucket
3. Push changes to the `main` branch to trigger deployment
4. Monitor the deployment in GitHub Actions
5. Set up custom domain (optional)
6. Configure monitoring and alerts
