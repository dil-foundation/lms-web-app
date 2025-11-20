# Observation System Hierarchy Guide

## 📊 Organizational Hierarchy

### Hierarchy Structure:
```
Program Manager (Top Level)
  ├── School Officers (Multiple)
  │     ├── Principals (Multiple per Officer)
  │     │     ├── Teachers (Multiple per Principal)
  │     │     │     └── Classes (Multiple per Teacher)
  │     │     └── Classes (Direct under Principal)
  │     └── Schools (Multiple per Officer)
  └── Projects (Multiple)
```

---

## 🎯 Observation Responsibilities

### 1. **Program Manager** (Top Level)
**Observes:**
- ✅ **School Officers** - Under their management
- ✅ **Projects** - Assigned to them

**Key Points:**
- Can manage multiple projects
- Observes School Officers' performance
- Observes overall project performance
- Gets reminders for both School Officers and Projects

**Example Reminders:**
- "Ms. Jennifer Martinez - School Officer: Observation #3 due in 5 days (Last score: 87%)"
- "Urban Education Initiative - Project: Observation #2 overdue (Last score: 85%)"
- "STEM Education Initiative - Project: Observation #2 due in 10 days (Last score: 90%)"

---

### 2. **School Officer** (Middle Level)
**Observes:**
- ✅ **Principals** - Under their management
- ✅ **Schools** - Under their management

**Key Points:**
- Can manage multiple schools
- Observes Principals' performance
- Observes Schools' performance
- Gets reminders for both Principals and Schools

**Example Reminders:**
- "Dr. Sarah Johnson - Greenwood Elementary: Observation #3 due in 3 days (Last score: 85%)"
- "Greenwood Elementary School: Observation #3 overdue (Last score: 82%)"
- "Riverside Middle School: Observation #2 due in 15 days (Last score: 78%)"

---

### 3. **Principal** (School Level)
**Observes:**
- ✅ **Teachers** - In their school
- ✅ **Classes** - In their school

**Key Points:**
- Manages single school only
- Observes Teachers' performance
- Observes Classes' performance
- Gets reminders for both Teachers and Classes

**Example Reminders:**
- "John Smith - Teacher: Observation #3 due in 12 days (Last score: 85%)"
- "Emily Davis - Teacher: Observation #2 due in 5 days (Last score: 92%)"
- "Grade 1-A - Class: Observation #2 overdue (Last score: 88%)"
- "Grade 3-A - Class: Observation #2 due in 2 days (Last score: 78%)"

---

## 🔔 Observation Reminder System

### Reminder Statuses:
1. **Overdue** (Red) - Past due date
   - Needs immediate attention
   - Showed with red badge and alert

2. **Due** (Amber) - Within 7 days of due date
   - Should be scheduled soon
   - Showed with amber badge

3. **Upcoming** (Blue) - More than 7 days before due date
   - Future observation
   - Showed with blue badge

---

## 📈 Progress Tracking

### For Each Entity Type:

#### Program Manager Views:
- School Officer observation history
- Project observation history
- Overall performance trends
- Comparison between School Officers
- Comparison between Projects

#### School Officer Views:
- Principal observation history
- School observation history
- Overall performance trends
- Comparison between Principals
- Comparison between Schools

#### Principal Views:
- Teacher observation history
- Class observation history
- Overall performance trends
- Comparison between Teachers
- Comparison between Classes

---

## 🎯 Observation Workflow

### Example: Principal Observing a Teacher

1. **Dashboard shows reminder**: "2 teacher observations due"
2. **Click reminder** → See list:
   - "John Smith - Last observed: Apr 10 (Score: 85%)"
   - "Emily Davis - Due in 5 days (Last score: 92%)"
   - "Michael Brown - Overdue (Last score: 78%)"
3. **Click "View History"** → See:
   - Observation #1: 80% (Jan 10)
   - Observation #2: 85% (Apr 10) ↑ +5%
   - Trend chart showing improvement
4. **Click "Create Observation #3"** → Form opens with:
   - Previous observation context panel
   - Last score: 85%
   - Areas of strength: Technology Integration, Student Engagement
   - Areas for improvement: Assessment Methods
5. **Complete observation** → Submit
6. **Dashboard updates** → New observation appears
7. **Trend updates** → Shows new score and trend

---

## 📋 Dashboard Features by Role

### Principal Dashboard:
- ✅ Observation Reminders (Teachers & Classes)
- ✅ School Observation Summary
- ✅ Teacher Observation History (in Teachers tab)
- ✅ Class Observation History (in Classes tab)
- ✅ Progress Charts (in Performance tab)
- ✅ Score Comparisons (in Performance tab)

### School Officer Dashboard:
- ✅ Observation Reminders (Principals & Schools)
- ✅ Principal Observation History (in Principals tab)
- ✅ School Observation History (in Schools tab)
- ✅ Progress Charts (in Performance tab)
- ✅ Score Comparisons (in Performance tab)

### Program Manager Dashboard:
- ✅ Observation Reminders (School Officers & Projects)
- ✅ School Officer Observation History (in Projects tab)
- ✅ Project Observation History (in Projects tab)
- ✅ Progress Charts (in Performance tab)
- ✅ Score Comparisons (in Performance tab)

---

## 🔄 Observation Schedule

### Default Schedule:
- **Frequency**: 3-4 observations per year
- **Interval**: ~90 days between observations
- **Reminder Window**: 30 days before due date

### Observation Numbers:
- Observation #1: Initial baseline
- Observation #2: 90 days later
- Observation #3: 90 days later
- Observation #4: 90 days later

---

## 💡 Key Benefits

1. **Automated Reminders** - Never miss an observation
2. **Historical Context** - See previous scores before creating new observation
3. **Progress Tracking** - Visual indicators showing improvement/decline
4. **Hierarchical Structure** - Clear understanding of who observes whom
5. **Scalability** - Supports multiple entities at each level

---

## 🎯 Implementation Status

✅ **All Dashboards Updated:**
- Principal Dashboard ✅
- School Officer Dashboard ✅
- Program Manager Dashboard ✅

✅ **Observation Components:**
- ObservationReminderCard ✅
- ObservationProgressChart ✅
- ObservationScoreComparison ✅
- ObservationSummaryCard ✅

✅ **Features:**
- Reminders for all entity types ✅
- Historical context display ✅
- Progress tracking ✅
- Click-to-action buttons ✅

---

**Status**: ✅ Complete
**Version**: 1.0.0
**Last Updated**: 2024

