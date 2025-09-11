# IRIS Deployment Guide

## 🚀 Complete Implementation of AI-Powered Database Assistant

This guide covers the deployment and configuration of the IRIS (Intelligent Response & Insight System) for your educational platform.

## 📋 Prerequisites

- Supabase project set up
- OpenAI API key
- MCP (Model Context Protocol) server endpoint
- Admin access to Supabase dashboard

## 🔧 Deployment Steps

### 1. Database Setup

First, run the database migration to create the chat logs table:

```bash
# Apply the migration
supabase db push

# Or manually run the migration
psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/129_create_iris_chat_logs.sql
```

### 2. Deploy Supabase Edge Function

Deploy the IRIS chat function:

```bash
# Deploy the function
supabase functions deploy iris-chat

# Verify deployment
supabase functions list
```

### 3. Configure Environment Variables

In your Supabase dashboard, go to **Project Settings > Functions > Secrets** and add:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
MCP_ADAPTER_URL=https://your-mcp-server.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Frontend Configuration

Ensure your frontend environment variables are set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Test the Implementation

1. Navigate to `/dashboard/iris` in your application
2. You should see the IRIS interface with a welcome message
3. Try asking: "Show me all students" or "What courses do we have?"

## 🔒 Security Configuration

### Role-Based Access Control

The system automatically applies role-based filtering:

- **Students**: Can only see their own data
- **Teachers**: Can see their students and courses
- **Admins**: Can see all platform data

### Database Security

- All queries are validated and sanitized
- Only read-only queries are allowed for regular users
- Write operations require special permissions
- All interactions are logged for audit purposes

## 📊 Monitoring and Analytics

### Chat Logs

All IRIS interactions are logged in the `iris_chat_logs` table with:
- User queries and responses
- Tools used (database queries)
- Token consumption
- Success/failure status
- Timestamps for analytics

### Analytics Dashboard

Access analytics through the `iris_analytics` view (admins only):

```sql
-- View recent IRIS usage
SELECT * FROM iris_analytics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- Token usage by role
SELECT 
    user_role,
    COUNT(*) as queries,
    AVG(tokens_used) as avg_tokens,
    SUM(tokens_used) as total_tokens
FROM iris_chat_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_role;
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Check if user is logged in
   - Verify Supabase auth tokens

2. **"MCP server not available" warning**
   - Verify MCP_ADAPTER_URL is correct
   - Check if MCP server is running
   - Test MCP endpoints manually

3. **"OpenAI API error"**
   - Verify OPENAI_API_KEY is valid
   - Check API usage limits
   - Monitor rate limiting

4. **Empty responses**
   - Check database permissions
   - Verify RLS policies
   - Test database queries manually

### Debug Mode

Enable debug logging in the Supabase function:

```typescript
// Add to the function for debugging
console.log('Debug info:', { userContext, messages, tools });
```

### Health Checks

Test individual components:

```bash
# Test Supabase function
curl -X POST "https://your-project.supabase.co/functions/v1/iris-chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"health check"}],"context":{"userId":"test","role":"admin","permissions":[]}}'

# Test MCP server
curl "https://your-mcp-server.com/tools"
```

## 📈 Performance Optimization

### Caching Strategies

1. **Database Schema Caching**: Cache table schemas for 1 hour
2. **Query Result Caching**: Cache common queries for 15 minutes
3. **User Context Caching**: Cache user permissions in session

### Token Management

Monitor OpenAI token usage:
- Set up alerts for high usage
- Implement token limits per user/role
- Use shorter context windows for efficiency

### Database Performance

- Ensure proper indexes on frequently queried tables
- Monitor query performance
- Use connection pooling
- Consider read replicas for analytics

## 🔄 Updates and Maintenance

### Regular Maintenance

1. **Log Cleanup**: Automatically removes logs older than 90 days
2. **Schema Updates**: Monitor database schema changes
3. **Function Updates**: Deploy new features via Supabase CLI

### Monitoring Checklist

- [ ] Function deployment status
- [ ] Database connection health
- [ ] OpenAI API status
- [ ] MCP server availability
- [ ] Token usage trends
- [ ] Error rates and patterns
- [ ] User satisfaction metrics

## 🆘 Support

### Getting Help

1. Check the troubleshooting section above
2. Review Supabase function logs
3. Monitor database query performance
4. Check OpenAI API status page
5. Verify MCP server health

### Contact Information

- Technical Issues: Your development team
- Database Issues: Your DBA team
- API Issues: Check OpenAI status page
- Feature Requests: Product team

## 🎯 Next Steps

After successful deployment:

1. **User Training**: Train users on IRIS capabilities
2. **Analytics Setup**: Configure monitoring dashboards
3. **Performance Tuning**: Optimize based on usage patterns
4. **Feature Expansion**: Add more MCP tools and capabilities
5. **Integration**: Connect with other platform services

---

**🎉 Congratulations!** Your IRIS system is now deployed and ready to provide AI-powered database insights to your users.
