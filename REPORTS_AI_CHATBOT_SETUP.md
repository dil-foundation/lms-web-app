# Reports AI Chatbot Setup Guide

## Overview

This implementation adds an AI-powered chatbot to the Reports tab in the LMS Admin Dashboard. The chatbot uses OpenAI's GPT-4 model to answer questions about platform data, generate reports for any timeline, and provide insights on user engagement and platform performance.

## Features

- 🤖 **OpenAI Integration**: Powered by GPT-4 for intelligent report generation
- 📊 **Timeline Reports**: Generate reports for any time period (daily, weekly, monthly, yearly)
- 👥 **User Analytics**: Analyze user engagement, registration trends, and behavior patterns
- 📚 **Course Performance**: Track course completion rates, popular content, and learner progress
- 💬 **Natural Language Queries**: Ask questions in plain English
- 🎯 **Contextual Responses**: AI has access to real platform data for accurate insights
- 📱 **Responsive Design**: Minimizable chat interface with professional UI
- 🔒 **Secure**: Role-based access control (Admin/Teacher only)

## Architecture

### Frontend Components
- `ReportsChatbot.tsx` - Main chatbot interface component
- `ReportsAIService.ts` - Service for handling AI API calls and data processing
- `authUtils.ts` - Authentication utilities for secure API access

### Backend Components
- `reports-assistant/` - Supabase Edge Function for OpenAI integration
- `reports-context/` - Supabase Edge Function for platform data context
- Database table for tracking AI interactions and analytics

## Installation & Setup

### 1. Prerequisites
- OpenAI API key with GPT-4 access
- Supabase project with Edge Functions enabled
- Admin or Teacher role access

### 2. Environment Variables

Add to your Supabase project's environment variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (already configured)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Deploy Edge Functions

```bash
# Deploy the reports assistant function
supabase functions deploy reports-assistant

# Deploy the reports context function  
supabase functions deploy reports-context
```

### 4. Run Database Migration

```bash
# Apply the AI interactions tracking table
supabase db push
```

### 5. Update API Configuration

The API endpoints are already configured in `src/config/api.ts`:
- `/api/ai/reports-assistant` - OpenAI chat completions
- `/api/reports/context` - Platform data context

## Usage

### For Admins/Teachers:

1. **Access**: Navigate to Reports tab in the admin dashboard
2. **Open Chatbot**: Click the floating bot icon in the bottom-right corner
3. **Ask Questions**: Type natural language queries such as:
   - "Show me user engagement for last month"
   - "What are the top performing courses?"
   - "Generate a report for January 2024"
   - "How many new users joined this week?"
   - "Course completion rates by category"

### Example Queries:

- **Timeline Reports**: "Show me analytics for Q3 2024", "User growth last 6 months"
- **User Analytics**: "How many active users do we have?", "New registrations this week"
- **Course Performance**: "Which courses have the highest completion rates?", "Popular content analysis"
- **Engagement Metrics**: "Average session duration", "User retention rates"
- **Comparative Analysis**: "Compare this month vs last month", "Year over year growth"

## Customization

### Modify AI Behavior
Edit the system prompt in `reportsAIService.ts` to customize the AI's personality and response style:

```typescript
private static readonly SYSTEM_PROMPT = `You are an AI assistant specialized in...`
```

### Add New Metrics
Extend the `getPlatformContext()` function in `reports-context/index.ts` to include additional data sources:

```typescript
// Add new metrics
const { data: newMetric } = await supabase
  .from('your_table')
  .select('your_columns')
```

### Custom UI Styling
Modify `ReportsChatbot.tsx` to match your brand colors and styling preferences.

## Security Features

- **Role-Based Access**: Only Admin and Teacher roles can access the chatbot
- **Token Validation**: All API requests require valid authentication tokens
- **RLS Policies**: Database interactions are protected by Row Level Security
- **Input Sanitization**: User queries are validated before processing
- **Rate Limiting**: Built-in protection against abuse (configurable)

## Analytics & Monitoring

The system tracks:
- User queries and AI responses
- Token usage for cost monitoring
- Response times and success rates
- Error logs and debugging information

Access analytics through the `ai_report_interactions` table:

```sql
SELECT 
  user_id,
  query,
  tokens_used,
  success,
  created_at
FROM ai_report_interactions
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues:

1. **"OpenAI API key not configured"**
   - Solution: Ensure OPENAI_API_KEY is set in Supabase environment variables

2. **"Invalid token" error**
   - Solution: Check authentication flow and token validation

3. **"Insufficient permissions" error**
   - Solution: Verify user has Admin or Teacher role

4. **Slow response times**
   - Solution: Check OpenAI API status and consider optimizing context data

### Debug Mode:
Enable debug logging by setting console.log statements in the Edge Functions to track request flow.

## Cost Optimization

- **Context Optimization**: The system provides relevant platform context to improve accuracy while minimizing token usage
- **Response Caching**: Consider implementing caching for common queries
- **Model Selection**: Uses GPT-4 by default, can be configured to use GPT-3.5-turbo for cost savings
- **Token Monitoring**: Track usage through the interactions table

## Future Enhancements

- [ ] Voice input/output capabilities
- [ ] Export generated reports to PDF/Excel
- [ ] Scheduled automated reports
- [ ] Integration with external analytics tools
- [ ] Multi-language support
- [ ] Advanced data visualizations
- [ ] Custom report templates

## Support

For technical support or feature requests, please check the implementation files:
- Frontend: `src/components/reports/ReportsChatbot.tsx`
- Backend: `supabase/functions/reports-assistant/index.ts`
- Database: `supabase/migrations/20241201000000_create_ai_report_interactions.sql`

---

**Note**: This implementation provides a foundation for AI-powered reporting. Customize and extend based on your specific requirements and data structure.
