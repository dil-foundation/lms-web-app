# OpenAI Models Assessment - Complete Codebase Analysis

## 📊 Executive Summary

This document provides a comprehensive assessment of all OpenAI models used across the application. The analysis covers all features that make OpenAI API calls.

---

## 🤖 Models Currently in Use

### 1. **GPT-4** (Primary Model)
**Usage Count:** 5 locations

#### Locations:
1. **`src/services/reportsAIService.ts`** (Line 1161)
   - **Feature:** Dynamic AI Report Generation
   - **Purpose:** Generates intelligent reports based on user queries and platform data
   - **Configuration:**
     - Model: `'gpt-4'`
     - Max Tokens: 1500
     - Temperature: 0.7
   - **Context:** Used for analyzing platform metrics, student performance, course analytics, and generating comprehensive reports

2. **`src/services/reportsAIService.ts`** (Line 1727)
   - **Feature:** AI Report Generation (Backend Call - Currently Disabled)
   - **Purpose:** Alternative OpenAI call through backend (fallback method)
   - **Configuration:**
     - Model: `'gpt-4'`
   - **Status:** Currently disabled, using mock responses

3. **`supabase/functions/apex-ai-assistant/index.ts`** (Line 484)
   - **Feature:** APEX AI Assistant - Query Generation
   - **Purpose:** Generates SQL queries based on user questions for FAQ/Knowledge Base searches
   - **Configuration:**
     - Model: `'gpt-4'`
     - Temperature: 0.1 (Low for consistent query generation)
     - Max Tokens: 1000
   - **Context:** Helps users find answers from FAQ database, knowledge base articles, and contact information

4. **`supabase/functions/apex-ai-assistant/index.ts`** (Line 569)
   - **Feature:** APEX AI Assistant - Response Generation
   - **Purpose:** Generates conversational responses based on database query results
   - **Configuration:**
     - Model: `'gpt-4'`
     - Temperature: 0.3 (Lower for consistent, helpful responses)
     - Max Tokens: 500
   - **Context:** Provides helpful, professional responses to user questions about the LMS platform

5. **`supabase/functions/reports-assistant/index.ts`** (Line 89)
   - **Feature:** Reports Assistant Edge Function
   - **Purpose:** AI-powered report generation assistant
   - **Configuration:**
     - Model: `'gpt-4'` (Default, can be overridden)
     - Temperature: 0.7 (Default)
     - Max Tokens: 1000 (Default)
   - **Context:** Allows clients to send messages and receive AI-generated report responses

---

### 2. **GPT-4o-mini** (Cost-Effective Model)
**Usage Count:** 3 locations

#### Locations:
1. **`supabase/functions/mcp-openai-adapter/index.ts`** (Line 254)
   - **Feature:** MCP OpenAI Adapter - Invoke Endpoint
   - **Purpose:** Main endpoint for MCP tool calling with OpenAI
   - **Configuration:**
     - Model: `"gpt-4o-mini"` (Default)
     - Temperature: 0.2 (Default)
     - **Available Models:** `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
   - **Context:** Converts MCP tools to OpenAI function calling format, supports iterative tool calling

2. **`supabase/functions/mcp-openai-adapter/index.ts`** (Line 1231)
   - **Feature:** MCP OpenAI Adapter - Invoke Stream Endpoint
   - **Purpose:** Streaming endpoint for MCP tool calling
   - **Configuration:**
     - Model: `"gpt-4o-mini"` (Default)
     - Temperature: 0.2 (Default)
   - **Context:** Provides streaming responses for real-time tool execution

3. **`supabase/functions/iris-chat-simple/index.ts`** (Line 267, 310)
   - **Feature:** IRIS Chat Assistant (Simple)
   - **Purpose:** AI assistant for educational platform analytics and management
   - **Configuration:**
     - Model: `"gpt-4o-mini"` (Hardcoded)
     - Temperature: 0.1 (Low for consistent responses)
   - **Context:** 
     - Analyzes user queries about students, teachers, courses, and platform data
     - Generates SQL queries using database tools
     - Provides conversational, business-friendly responses
     - Supports both streaming and non-streaming modes

---

### 3. **DALL-E 3** (Image Generation)
**Usage Count:** 1 location

#### Location:
1. **`supabase/functions/generate-course-thumbnail/index.ts`** (Line 61)
   - **Feature:** Course Thumbnail Generation
   - **Purpose:** Generates course thumbnails using AI image generation
   - **Configuration:**
     - Model: `'dall-e-3'`
     - Size: `'1792x1024'` (16:9 aspect ratio)
     - Quality: `'standard'`
     - Style: `'natural'`
     - Number of images: 1
   - **Context:** Creates high-quality thumbnails for courses based on course titles/descriptions

---

## 📋 Model Usage Summary by Feature

### **AI Report Generation**
- **Model:** GPT-4
- **Locations:** 2 (1 active, 1 disabled)
- **Use Case:** Dynamic report generation from platform data
- **Temperature:** 0.7
- **Max Tokens:** 1500

### **APEX AI Assistant**
- **Model:** GPT-4
- **Locations:** 2
- **Use Cases:**
  1. SQL Query Generation (Temperature: 0.1)
  2. Conversational Response Generation (Temperature: 0.3)
- **Max Tokens:** 500-1000

### **IRIS Chat Assistant**
- **Model:** GPT-4o-mini
- **Locations:** 1 (multiple calls)
- **Use Case:** Educational platform analytics and management
- **Temperature:** 0.1
- **Features:** SQL query generation, data analysis, conversational responses

### **MCP OpenAI Adapter**
- **Model:** GPT-4o-mini (Default)
- **Locations:** 2 endpoints
- **Use Case:** Tool calling and function execution
- **Temperature:** 0.2
- **Available Models:** gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo

### **Reports Assistant**
- **Model:** GPT-4 (Default, configurable)
- **Locations:** 1
- **Use Case:** AI-powered report generation
- **Temperature:** 0.7 (Default)
- **Max Tokens:** 1000 (Default)

### **Course Thumbnail Generation**
- **Model:** DALL-E 3
- **Locations:** 1
- **Use Case:** AI-generated course thumbnails
- **Output:** 1792x1024 images

---

## 🎯 Model Selection Rationale

### **GPT-4 Usage:**
- **Why:** High-quality responses for complex analytical tasks
- **Features:** Report generation, query understanding, response quality
- **Trade-off:** Higher cost but better accuracy

### **GPT-4o-mini Usage:**
- **Why:** Cost-effective for high-volume operations
- **Features:** Tool calling, SQL generation, conversational AI
- **Trade-off:** Lower cost with good performance for structured tasks

### **DALL-E 3 Usage:**
- **Why:** High-quality image generation
- **Features:** Course thumbnails with natural style
- **Trade-off:** Image generation requires specialized model

---

## 📊 Model Distribution

| Model | Count | Primary Use Cases |
|-------|-------|-------------------|
| **GPT-4** | 5 | Report generation, AI assistants, query generation |
| **GPT-4o-mini** | 3 | IRIS chat, MCP adapter, tool calling |
| **DALL-E 3** | 1 | Image generation (thumbnails) |
| **Total** | **9** | **Multiple AI features** |

---

## 🔧 Configuration Details

### **Temperature Settings:**
- **0.1:** Query generation, IRIS chat (consistency)
- **0.2:** MCP adapter (balanced)
- **0.3:** APEX response generation (helpful)
- **0.7:** Report generation, Reports assistant (creative)

### **Token Limits:**
- **500:** APEX response generation
- **1000:** Query generation, Reports assistant
- **1500:** Report generation (main)

---

## 📝 Database Schema References

### **Model Tracking:**
- **Table:** `ai_report_interactions`
  - Column: `model_used` (Default: `'gpt-4'`)
  - Purpose: Track which model was used for each report generation

- **Table:** `iris_chat_logs`
  - Column: `tokens_used`
  - Purpose: Track token consumption for IRIS interactions

---

## 🚀 Recommendations

### **Current State:**
✅ **Well-optimized:** Using GPT-4o-mini for high-volume operations (IRIS, MCP adapter)
✅ **Quality-focused:** Using GPT-4 for critical features (reports, assistants)
✅ **Specialized:** Using DALL-E 3 for image generation

### **Potential Optimizations:**
1. **Consider GPT-4o** for MCP adapter when higher quality needed
2. **Monitor costs** - GPT-4 usage in 5 locations may be expensive
3. **Evaluate GPT-4 Turbo** for report generation if faster responses needed
4. **Consider model switching** based on query complexity

---

## 📍 File Locations Summary

### **Frontend Services:**
- `src/services/reportsAIService.ts` (2 GPT-4 calls)

### **Supabase Edge Functions:**
- `supabase/functions/apex-ai-assistant/index.ts` (2 GPT-4 calls)
- `supabase/functions/reports-assistant/index.ts` (1 GPT-4 call)
- `supabase/functions/mcp-openai-adapter/index.ts` (2 GPT-4o-mini calls)
- `supabase/functions/iris-chat-simple/index.ts` (1 GPT-4o-mini call)
- `supabase/functions/generate-course-thumbnail/index.ts` (1 DALL-E 3 call)

---

## ✅ Summary

**Total OpenAI API Calls:** 9 locations
- **GPT-4:** 5 locations (Primary for quality)
- **GPT-4o-mini:** 3 locations (Cost-effective)
- **DALL-E 3:** 1 location (Image generation)

**Features Using OpenAI:**
1. AI Report Generation
2. APEX AI Assistant
3. IRIS Chat Assistant
4. MCP OpenAI Adapter
5. Reports Assistant
6. Course Thumbnail Generation

---

**Assessment Date:** 2024
**Status:** ✅ Complete Analysis
**Next Review:** Consider cost optimization and model performance evaluation

