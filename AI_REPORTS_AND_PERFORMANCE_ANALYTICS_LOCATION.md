# AI Reports & Performance Analytics - Location Guide

## 📍 AI Reports Page Location

### **Route:**
- **Path:** `/dashboard/ai-reports`
- **Component:** `ReportsAnalytics` (from `src/components/admin/ReportsAnalytics.tsx`)
- **Access:** Admin, Super User, Content Creator (in AI Mode)

### **How to Access:**
1. Navigate to `/dashboard/ai-reports`
2. Or click "Performance Analytics" in sidebar when in **AI Mode**
3. Available to: Admin, Super User, Content Creator roles

### **What It Shows:**
- AI Tutor Performance Analytics
- Practice Stage Performance
- User Engagement Metrics
- Time Usage Patterns
- Top Content Accessed
- Analytics Overview

---

## 📊 Performance Analytics - Two Locations

### **Location 1: AI Tutor Portal (AI Mode)**
- **Route:** `/dashboard/ai-reports`
- **Component:** `ReportsAnalytics`
- **Purpose:** AI Tutor analytics and performance metrics
- **Navigation:** "Performance Analytics" in AI Mode sidebar
- **Shows:**
  - Practice stage performance
  - AI Tutor user engagement
  - Learning analytics
  - Exercise completion rates
  - Milestone achievements

### **Location 2: LMS Portal (LMS Mode)**
- **Route:** `/dashboard/reports`
- **Component:** `ReportsOverview` (for admin) or `ReportsPage` (for teachers/principals)
- **Purpose:** LMS course and student performance analytics
- **Navigation:** "Performance Analytics" in LMS Mode sidebar
- **Shows:**
  - Course performance
  - Student enrollment metrics
  - Assignment completion
  - Quiz scores
  - LMS engagement data

---

## 🎯 Which Portal is Performance Analytics On?

### **Answer: BOTH Portals**

**Performance Analytics exists in both:**

1. **AI Tutor Portal** (`/dashboard/ai-reports`)
   - When you're in **AI Mode**
   - Shows AI Tutor-specific analytics
   - Component: `ReportsAnalytics`

2. **LMS Portal** (`/dashboard/reports`)
   - When you're in **LMS Mode**
   - Shows LMS-specific analytics
   - Component: `ReportsOverview` or `ReportsPage`

---

## 🔄 Mode-Based Navigation

### **AI Mode Navigation:**
```typescript
// From roleNavigation.ts (lines 388, 435)
{
  title: 'ANALYTICS',
  items: [
    { title: 'Performance Analytics', path: '/dashboard/ai-reports', icon: BarChart3 },
  ]
}
```

### **LMS Mode Navigation:**
```typescript
// From roleNavigation.ts (lines 39, 48, 57, 75, 159, 210, 282)
{ title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion }
```

---

## 📋 Route Mapping

| Route | Component | Mode | Purpose |
|-------|-----------|------|---------|
| `/dashboard/ai-reports` | `ReportsAnalytics` | **AI Mode** | AI Tutor analytics |
| `/dashboard/reports` | `ReportsOverview` / `ReportsPage` | **LMS Mode** | LMS analytics |

---

## 🎨 Component Details

### **ReportsAnalytics** (`/dashboard/ai-reports`)
- **File:** `src/components/admin/ReportsAnalytics.tsx`
- **Title:** "Performance Analytics"
- **Subtitle:** "Monitor platform performance and user engagement"
- **Features:**
  - Practice Stage Performance charts
  - User Engagement Overview
  - Time Usage Patterns
  - Top Content Accessed
  - Analytics Overview dashboard

### **ReportsOverview** (`/dashboard/reports` - Admin)
- **File:** `src/components/admin/ReportsOverview.tsx`
- **Title:** "Performance Analytics"
- **Purpose:** LMS course and student analytics

### **ReportsPage** (`/dashboard/reports` - Teachers/Principals)
- **File:** `src/pages/ReportsPage.tsx`
- **Title:** "Performance Analytics"
- **Purpose:** Role-specific performance reports

---

## ✅ Summary

### **AI Reports Page:**
- **Location:** `/dashboard/ai-reports`
- **Component:** `ReportsAnalytics`
- **Access:** Admin, Super User, Content Creator (AI Mode)
- **Model Used:** GPT-4 (via ReportsChatbot if present)

### **Performance Analytics:**
- **AI Tutor Portal:** `/dashboard/ai-reports` (AI Mode)
- **LMS Portal:** `/dashboard/reports` (LMS Mode)
- **Both portals have Performance Analytics, but different routes and components**

---

**Last Updated:** 2024
**Status:** ✅ Clarified

