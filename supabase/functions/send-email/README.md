# Send Email Edge Function

Supabase Edge Function for sending emails via **Resend API** - the modern email solution built for edge functions.

## 🌟 Why Resend?

- ✅ **Purpose-built for edge/serverless** environments
- ✅ **FREE Tier**: 3,000 emails/month, 100 emails/day
- ✅ **Lightning Fast**: <100ms response time
- ✅ **Reliable**: 99.9%+ uptime, no TCP connection issues
- ✅ **Better Deliverability**: Built-in SPF/DKIM authentication
- ✅ **Simple REST API**: No complex SMTP configuration
- ✅ **Great Developer Experience**: Clear error messages, comprehensive docs

## 📧 Features

- ✅ HTML email support with excellent compatibility
- ✅ Secure API key management via Supabase secrets
- ✅ Comprehensive error logging for debugging
- ✅ Service-role authentication for security
- ✅ Called by other edge functions (e.g., `stripe-webhook`)
- ✅ CORS support for cross-origin requests

---

## 🚀 Quick Setup

### Step 1: Sign up for Resend (FREE)

1. Go to [resend.com/signup](https://resend.com/signup)
2. Verify your email address
3. Complete the onboarding

### Step 2: Get Your API Key

1. Navigate to **API Keys** in the dashboard
2. Click **Create API Key**
3. Give it a name (e.g., "DIL LMS Production")
4. Copy the API key (starts with `re_`)

### Step 3: Configure Supabase Secrets

```bash
# Set your Resend API key (required)
supabase secrets set RESEND_API_KEY="re_your_api_key_here"

# Optional: Set custom sender name and email
supabase secrets set \
  RESEND_FROM_EMAIL="noreply@yourdomain.com" \
  RESEND_FROM_NAME="Your App Name"
```

**Note:** If you don't set a custom sender, it will use `onboarding@resend.dev` by default (works for testing, max 50 emails/day).

### Step 4: Deploy the Function

```bash
supabase functions deploy send-email
```

**That's it!** You're ready to send emails. ✨

---

## 🎯 Domain Setup (Recommended)

To send from your own domain (e.g., `noreply@yourdomain.com`):

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown (SPF, DKIM, DMARC)
5. Wait for verification (usually <5 minutes)
6. Update your secrets:
   ```bash
   supabase secrets set RESEND_FROM_EMAIL="noreply@yourdomain.com"
   ```

**Benefits of custom domain:**
- ✅ Unlimited emails (within plan limits)
- ✅ Better deliverability
- ✅ Professional sender address
- ✅ Brand consistency

---

## 📤 Usage

### Request Format

```typescript
POST /functions/v1/send-email

Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY

Body:
{
  "to": "recipient@example.com",
  "subject": "Welcome to DIL LMS",
  "html": "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
  "from": "custom@domain.com",      // optional, overrides default
  "fromName": "Custom Sender Name"   // optional, overrides default
}
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "to": "recipient@example.com",
  "subject": "Welcome to DIL LMS",
  "messageId": "abc123-def456-ghi789",
  "provider": "resend"
}
```

**Error (500):**
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Example: Send from Stripe Webhook

```typescript
const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Payment Confirmed',
    html: '<h1>Thank you!</h1><p>Your payment was successful.</p>',
  }),
});
```

---

## 📊 Expected Log Output

```
📧 [SendEmail] Function invoked
✅ [SendEmail] Authorization verified
✅ [SendEmail] Using Resend API
📨 [SendEmail] Email request: { to: 'user@example.com', subject: 'Test', ... }
📤 [SendEmail] Sending via Resend API...
📧 [SendEmail] From: DIL LMS <noreply@yourdomain.com>
✅ [SendEmail] Email sent successfully via Resend
📧 [SendEmail] Message ID: abc123-def456-ghi789
```

---

## 🔧 Troubleshooting

### 1. Missing API Key

**Error:**
```
❌ RESEND_API_KEY is required
```

**Solution:**
```bash
supabase secrets set RESEND_API_KEY="re_your_api_key"
supabase functions deploy send-email
```

### 2. Invalid API Key

**Error:**
```
❌ Resend API error: Invalid API key
```

**Solution:**
- Verify your API key starts with `re_`
- Check it's correctly set: `supabase secrets list`
- Generate a new key at [resend.com/api-keys](https://resend.com/api-keys)
- Make sure you copied the entire key

### 3. Domain Not Verified

**Error:**
```
❌ Resend API error: Domain not verified
```

**Solution:**
- If using custom domain, verify DNS records are added
- Or use `onboarding@resend.dev` for testing (50 emails/day limit)
- Check domain status at [resend.com/domains](https://resend.com/domains)

### 4. Rate Limit Exceeded

**Error:**
```
❌ Resend API error: Rate limit exceeded
```

**Solution:**
- **Free tier limits:**
  - 100 emails/day
  - 3,000 emails/month
- Upgrade at [resend.com/pricing](https://resend.com/pricing) if needed
- Or wait 24 hours for daily limit to reset

### 5. Email Not Delivered

**Issue:** Email sent successfully but not received

**Checklist:**
- ✅ Check recipient's spam folder
- ✅ Verify domain is properly configured (SPF, DKIM, DMARC)
- ✅ Ensure sender email matches verified domain
- ✅ Check Resend logs at [resend.com/emails](https://resend.com/emails)
- ✅ Verify recipient email address is correct

### 6. Unauthorized Error

**Error:**
```
❌ Unauthorized: Missing authorization header
```

**Solution:**
- Ensure you're using the Supabase **service role key** (not anon key)
- Include header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
- This function should only be called from backend/edge functions

---

## 🧪 Testing

### Local Testing

```bash
# Start local function
supabase functions serve send-email

# Send test email
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1><p>This is a test email from Resend.</p>"
  }'
```

### Production Testing

After deploying, trigger a test payment to verify payment confirmation emails work:

```bash
# Watch logs in real-time
supabase functions logs send-email --tail
```

---

## 📈 Resend Free Tier

Perfect for most applications:

- ✅ **3,000 emails/month**
- ✅ **100 emails/day**
- ✅ **Multiple custom domains**
- ✅ **Unlimited API keys**
- ✅ **Team members**
- ✅ **Webhooks** (delivery status notifications)
- ✅ **Email logs** and analytics
- ✅ **99.9% uptime SLA**

**Need more?** Paid plans start at $20/month for 50,000 emails.

---

## 🔐 Security

- ✅ Requires service role key authentication
- ✅ Only callable by backend services (not directly from clients)
- ✅ API keys stored securely in Supabase secrets
- ✅ No credentials logged in console output
- ✅ CORS properly configured for cross-origin requests

---

## 📚 Resources

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **API Reference**: [resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- **Pricing**: [resend.com/pricing](https://resend.com/pricing)
- **Status Page**: [status.resend.com](https://status.resend.com)
- **Supabase Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

---

## 🔄 Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | **Yes** | Your Resend API key | None |
| `RESEND_FROM_EMAIL` | No | Default sender email | `onboarding@resend.dev` |
| `RESEND_FROM_NAME` | No | Default sender name | `DIL LMS` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | For authorization (auto-set) | Auto |

---

## 📞 Support

- **Resend Support**: [resend.com/support](https://resend.com/support)
- **Resend Discord**: [resend.com/discord](https://resend.com/discord)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)

---

## 🎉 Success Stories

Resend is used by thousands of companies for edge function emails:
- ✅ Vercel deployments
- ✅ Netlify functions
- ✅ Cloudflare Workers
- ✅ Deno Deploy
- ✅ Supabase Edge Functions

**You're in good company!** 🚀

