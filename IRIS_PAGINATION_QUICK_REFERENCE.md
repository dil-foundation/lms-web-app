# IRIS Pagination - Quick Reference Guide

## For Administrators Using IRIS

This guide helps you understand how IRIS handles large datasets and how to navigate paginated results.

---

## 📊 What is Pagination?

**Pagination** means breaking large result sets into smaller "pages" to:
- ✅ Prevent errors (token overflow)
- ✅ Get faster responses
- ✅ Save costs
- ✅ Improve readability

**Instead of:** Showing 1,000 students at once
**IRIS shows:** First 50 students, with option to see more

---

## 🎯 When Does IRIS Paginate?

IRIS **automatically paginates** these queries:

| Query Type | LIMIT | Example |
|------------|-------|---------|
| **Simple lists** | 50 | "List all students" |
| **Detailed queries** | 20 | "Show all assignments" |
| **Content-heavy** | 10 | "Show all submissions" |
| **Analytics/Usage** | 30-50 | "Platform usage for Q4 2025" |
| **Count queries** | No limit | "How many students?" |

---

## 📅 Time-Based Queries (NEW!)

### Quarterly Queries

**Your Query:** "Platform usage for 2025 Q4 with user names"

**IRIS Understands:**
- Q4 2025 = October 1 - December 31, 2025
- Needs to find activity data (sessions, logins, access logs)
- Include user names and usage metrics
- **Still applies pagination!** (LIMIT 50)

**What You'll Get:**
```
Found 345 users active in Q4 2025.

Showing top 50 most active users:

| User Name | Email | Role | Sessions | Active Days |
|-----------|-------|------|----------|-------------|
| John Doe  | ...   | ...  | 145      | 42          |
| ...

📄 Showing 1-50 of 345 total users.
💡 To see more: 'Show next 50 users for Q4 2025'
```

### Other Time Periods

| Query | Date Range IRIS Uses |
|-------|---------------------|
| "Q1 2025" | Jan 1 - Mar 31, 2025 |
| "Q2 2025" | Apr 1 - Jun 30, 2025 |
| "Q3 2025" | Jul 1 - Sep 30, 2025 |
| "Q4 2025" | Oct 1 - Dec 31, 2025 |
| "November 2025" | Nov 1 - Nov 30, 2025 |
| "This year" | Current year (Jan 1 - Dec 31) |

---

## 🔄 How to Navigate Paginated Results

### Option 1: Next Batch (Sequential)
```
You: "Show next 50 students"
IRIS: Shows students 51-100
```

### Option 2: Specific Range
```
You: "Show students 101-150"
IRIS: Shows exactly students 101-150
```

### Option 3: Filter to Reduce Results
```
You: "Show only active students"
IRIS: Applies filter, returns first 50 active students
```

### Option 4: Time-Based Next Page
```
You: "Show next 50 users for Q4 2025"
IRIS: Shows users 51-100 from Q4 2025 results
```

---

## 💡 Example Conversations

### Example 1: Large User List

```
You: "List all students"

IRIS: "Found 1,247 students in the system.

Showing first 50 students:
[Table with 50 rows]

📄 Showing 1-50 of 1,247 total results.
💡 To see more: 'Show next 50 students'"

---

You: "Show next 50 students"

IRIS: "Showing students 51-100 of 1,247 total:
[Table with 50 rows]"
```

---

### Example 2: Q4 2025 Usage Report

```
You: "Can you give me platform usage for 2025 Q4 with user names?"

IRIS: "Found 345 users active in Q4 2025 (October - December).

Top 50 most active users:
[Table with user names, sessions, active days, etc.]

📄 Showing 1-50 of 345 total users.
💡 To see more: 'Show next 50 users for Q4 2025'"

---

You: "Show next 50 users for Q4 2025"

IRIS: "Showing users 51-100 for Q4 2025:
[Table with next 50 users]"
```

---

### Example 3: Filtered Query

```
You: "Show active courses in November 2025"

IRIS: "Found 89 active courses in November 2025.

Showing first 50 courses:
[Table with courses]

📄 Showing 1-50 of 89 total courses."
```

---

## 🎨 What Data IRIS Shows

### For User Queries
IRIS automatically selects relevant columns:
- ✅ Full name
- ✅ Email
- ✅ Role
- ✅ Created date
- ❌ Passwords (never shown)
- ❌ Auth tokens (never shown)

### For Usage/Analytics Queries
IRIS shows metrics like:
- ✅ Session count
- ✅ Active days
- ✅ First/last activity
- ✅ Login frequency
- ❌ Large text fields (excluded for performance)

---

## ⚡ Performance Tips

### Get Faster Results

1. **Be Specific:**
   - ❌ "Show all data"
   - ✅ "Show students from November 2025"

2. **Use Filters:**
   - ❌ "List all users"
   - ✅ "List active students"

3. **Ask for Counts First:**
   - ✅ "How many students logged in Q4 2025?"
   - Then: "Show me the list"

4. **Request Summary Statistics:**
   - ✅ "Give me summary stats for Q4 2025"
   - Better than: "Show all activity"

---

## 🚨 Common Questions

### Q: Why doesn't IRIS show all results at once?

**A:** Showing thousands of records would:
- Cause errors (token limit exceeded)
- Take very long to load
- Be hard to read
- Cost more to generate

Pagination gives you **faster, error-free results**.

---

### Q: How do I get ALL the data if I need it?

**Options:**

1. **Request Export** (when available):
   ```
   "Export all students to Excel"
   ```

2. **Use Filters** to reduce dataset:
   ```
   "Show students from Computer Science department"
   ```

3. **Navigate Pages** to see everything:
   ```
   "Show students 1-50"
   "Show students 51-100"
   ... continue as needed
   ```

---

### Q: Does pagination work with date filters?

**A:** Yes! Even with date filters, IRIS applies pagination:

```
Query: "Platform usage for Q4 2025"
→ Still limited to first 50 results
→ Total count shown: "345 users found"
→ Can navigate: "Show next 50 for Q4 2025"
```

---

### Q: What if I ask for a specific count?

**A:** IRIS respects your request (up to max 100):

```
You: "Show me 10 most active users in Q4 2025"
IRIS: Shows exactly 10 users

You: "Show me 75 recent students"
IRIS: Shows exactly 75 students

You: "Show me 200 courses"
IRIS: Shows 100 (maximum allowed)
```

---

## 🎯 Best Practices

### DO ✅

- Ask for counts first: "How many students?"
- Use time filters: "Q4 2025", "November 2025"
- Request summaries: "Summary of Q4 usage"
- Navigate sequentially: "Show next 50"
- Use filters: "Active students only"

### DON'T ❌

- Ask for "all data" without context
- Request very large exports without filtering
- Expect instant results for thousands of records
- Try to bypass pagination (it's automatic)

---

## 📈 Usage Examples by Category

### Student Analytics
```
"How many students enrolled in Q4 2025?"
"Show top 50 active students"
"List students who logged in November 2025"
"Show students 51-100"
```

### Course Analytics
```
"Platform usage for 2025 Q4 with user names"
"Show active courses in Q4"
"List courses created in October 2025"
"Show next 50 courses"
```

### Teacher Reports
```
"Show all teachers who created content in Q4 2025"
"List teachers by activity in November"
"Show teacher usage for Q4 2025"
```

### System Usage
```
"Show login activity for Q4 2025"
"Access logs for November 2025 with user names"
"Platform statistics for Q4 2025"
```

---

## 🎓 Pro Tips

1. **Start with Counts**
   ```
   "How many users were active in Q4 2025?"
   → Get total first
   → Then request details
   ```

2. **Use Top/Bottom Queries**
   ```
   "Show top 20 most active users"
   → Pre-filtered results
   → Faster response
   ```

3. **Combine Filters**
   ```
   "Show active students from Q4 2025"
   → Two filters applied
   → Smaller result set
   ```

4. **Request Summaries**
   ```
   "Give me summary statistics for Q4 2025"
   → Aggregated metrics
   → No pagination needed
   ```

---

## 📞 Need Help?

If you encounter issues:

1. **Check the response** - IRIS always tells you pagination info
2. **Refine your query** - Be more specific
3. **Use filters** - Reduce dataset size
4. **Ask for counts** - Understand data size first

---

## 📋 Quick Command Reference

| What You Want | What to Ask |
|---------------|-------------|
| Total count | "How many students?" |
| First page | "List all students" |
| Next page | "Show next 50 students" |
| Specific page | "Show students 101-150" |
| Filtered | "Show active students" |
| Time-based | "Show Q4 2025 usage" |
| Top N | "Show top 20 active users" |
| Export | "Export students to Excel" |

---

**Last Updated:** 2025-11-12
**Feature:** IRIS Automatic Pagination
**Status:** ✅ Active and Deployed
