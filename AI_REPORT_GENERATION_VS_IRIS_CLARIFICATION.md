# AI Report Generation vs IRIS Chat - Clarification Document

## 🎯 Key Distinction

You have **TWO SEPARATE AI SYSTEMS** in your application:

1. **AI Report Generation** (GPT-4) - Used in ReportsChatbot
2. **IRIS Chat Assistant** (GPT-4o-mini) - Used in IRISv2

---

## 📊 System 1: AI Report Generation (GPT-4)

### **Location:**
- **Component:** `src/components/reports/ReportsChatbot.tsx`
- **Service:** `src/services/reportsAIService.ts`
- **Route:** `/ai-reports` (ReportsAnalytics page)
- **Model:** **GPT-4**

### **How It Works:**
1. User interacts with **ReportsChatbot** component
2. User types a query or clicks a Quick Action
3. Query is sent to `ReportsAIService.generateReportResponse()`
4. Service calls OpenAI API with **GPT-4** model
5. Returns formatted report with analytics

### **Features:**
- ✅ Generates comprehensive reports
- ✅ Uses GPT-4 for high-quality analysis
- ✅ Focuses on LMS and AI Tutor metrics
- ✅ Creates formatted markdown reports
- ✅ Has conversation history support

### **Quick Actions:**
- ReportsChatbot can receive Quick Action events from IRISv2
- But it processes them using **GPT-4** (not GPT-4o-mini)

---

## 🤖 System 2: IRIS Chat Assistant (GPT-4o-mini)

### **Location:**
- **Component:** `src/components/admin/IRISv2.tsx`
- **Service:** `src/services/irisService.ts`
- **Edge Function:** `supabase/functions/iris-chat-simple/index.ts`
- **Route:** `/dashboard/iris`
- **Model:** **GPT-4o-mini**

### **How It Works:**
1. User interacts with **IRISv2** component
2. User types a query OR clicks a Quick Action button
3. Query is sent to `IRISService.sendMessageStream()`
4. Service calls `iris-chat-simple` edge function
5. Edge function uses **GPT-4o-mini** via MCP OpenAI adapter
6. Returns conversational response with database query results

### **Features:**
- ✅ Real-time database queries
- ✅ Uses GPT-4o-mini for cost-effective operations
- ✅ Natural language to SQL conversion
- ✅ Streaming responses
- ✅ Multi-platform support (AI Tutor & LMS)

### **Quick Actions in IRISv2:**
- **AI Tutor Quick Actions:**
  - Daily Learning Analytics
  - Learning Milestones
  - Learning Unlocks
  - Exercise Progress
  - User Progress Summary
  - Weekly Summary

- **LMS Quick Actions:**
  - Course Management
  - Student Analytics
  - Teacher Overview
  - Admin Users
  - Learning Outcomes
  - Content Management Analytics

**When you click these Quick Actions in IRISv2:**
- `handleQuickAction()` is called (Line 491 in IRISv2.tsx)
- It calls `handleSendMessage()` with the prompt
- Message is sent to **IRIS Service** (GPT-4o-mini)
- IRIS generates SQL queries using GPT-4o-mini
- IRIS executes queries and returns results
- **Uses GPT-4o-mini, NOT GPT-4**

---

## 🔄 The Confusion: Quick Actions

### **Where You See Quick Actions:**

1. **IRISv2 Component** (`/dashboard/iris`)
   - Has Quick Actions sidebar
   - AI Tutor and LMS quick action buttons
   - **Uses GPT-4o-mini** when clicked

2. **ReportsChatbot Component** (`/ai-reports`)
   - Can receive Quick Action events
   - But processes them with **GPT-4**
   - Separate from IRISv2

### **Important Note:**
- ReportsChatbot listens for `quickActionSelected` events (for potential future integration)
- But IRISv2's Quick Actions handle internally via `handleQuickAction()` → `handleSendMessage()`
- IRISv2 Quick Actions **DO NOT** dispatch events to ReportsChatbot
- They are **completely separate systems**

---

## 📍 Where Each System is Used

### **AI Report Generation (GPT-4):**
- **Route:** `/ai-reports`
- **Component:** `ReportsAnalytics` → Contains `ReportsChatbot`
- **Purpose:** Generate comprehensive analytics reports
- **Model:** GPT-4
- **Output:** Formatted markdown reports with insights

### **IRIS Chat (GPT-4o-mini):**
- **Route:** `/dashboard/iris`
- **Component:** `IRISv2`
- **Purpose:** Interactive database querying and analytics
- **Model:** GPT-4o-mini
- **Output:** Conversational responses with query results

---

## 🎯 Answer to Your Question

### **"Under Quick actions there are reports for LMS and AI Tutor, is that where we are using GPT-4?"**

**Answer: NO** - Those Quick Actions in IRISv2 use **GPT-4o-mini**, not GPT-4.

### **"Where user types queries in IRIS, is where we use GPT-4o-mini?"**

**Answer: YES** - When users type queries in IRISv2, it uses **GPT-4o-mini**.

### **"How can I distinguish which is which?"**

**Distinction:**

1. **If you're on `/dashboard/iris` page:**
   - You're using **IRIS Chat** (GPT-4o-mini)
   - Quick Actions → GPT-4o-mini
   - Typed queries → GPT-4o-mini
   - All interactions → GPT-4o-mini

2. **If you're on `/ai-reports` page:**
   - You're using **AI Report Generation** (GPT-4)
   - All queries → GPT-4
   - Report generation → GPT-4

---

## 📋 Summary Table

| Feature | Component | Route | Model | Purpose |
|---------|-----------|-------|-------|---------|
| **AI Report Generation** | ReportsChatbot | `/ai-reports` | **GPT-4** | Generate formatted reports |
| **IRIS Chat** | IRISv2 | `/dashboard/iris` | **GPT-4o-mini** | Interactive database queries |
| **Quick Actions (Reports)** | ReportsChatbot | `/ai-reports` | **GPT-4** | Pre-defined report prompts |
| **Quick Actions (IRIS)** | IRISv2 | `/dashboard/iris` | **GPT-4o-mini** | Pre-defined query prompts |

---

## 🔍 Code References

### **GPT-4 Usage (ReportsAIService):**
```typescript
// src/services/reportsAIService.ts (Line 1161)
model: 'gpt-4',
max_tokens: 1500,
temperature: 0.7
```

### **GPT-4o-mini Usage (IRIS):**
```typescript
// supabase/functions/iris-chat-simple/index.ts (Line 267)
model: "gpt-4o-mini",
temperature: 0.1
```

---

## ✅ Final Answer

**Quick Actions for LMS and AI Tutor reports:**
- If in **IRISv2** (`/dashboard/iris`) → Uses **GPT-4o-mini**
- If in **ReportsChatbot** (`/ai-reports`) → Uses **GPT-4**

**User queries:**
- If typed in **IRISv2** → Uses **GPT-4o-mini**
- If typed in **ReportsChatbot** → Uses **GPT-4**

**The Quick Actions you see in IRISv2 use GPT-4o-mini, not GPT-4.**

---

**Last Updated:** 2024
**Status:** ✅ Clarified

