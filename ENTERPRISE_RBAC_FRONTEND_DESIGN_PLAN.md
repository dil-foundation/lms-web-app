# Enterprise RBAC Front-End Design Plan

## Executive Summary

This document outlines the front-end design plan for implementing enterprise-level Role-Based Access Control (RBAC) features in the LMS platform. The design focuses on creating a clean, intuitive, and scalable user interface that supports multi-level role management, controlled sign-up workflows, password policies, granular permissions, and comprehensive audit logging.

---

## 1. Current State Assessment

### 1.1 Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **UI Library**: Shadcn UI (Radix UI components)
- **State Management**: React Context + TanStack Query
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS

### 1.2 Existing RBAC Implementation
- **Current Roles**: `student`, `teacher`, `admin`, `content_creator`, `super_user`, `view_only`
- **Role Guard Component**: `src/components/auth/RoleGuard.tsx`
- **Navigation**: Role-based navigation in `src/config/roleNavigation.ts`
- **Security Page**: `src/components/admin/AdminSecurity.tsx` (basic security settings)
- **User Management**: `src/components/admin/UsersManagement.tsx` (basic CRUD)
- **Audit Logging**: `src/services/accessLogService.ts` (basic logging)

### 1.3 Gaps Identified
1. **Missing Roles**: Content Developer, Project Manager, School Officer, Principal
2. **No Approval Workflow**: Sign-ups are direct without multi-tier approval
3. **Limited Password Policies**: No complexity requirements, expiration, or reset mechanisms UI
4. **No Granular Permissions**: Permissions are role-based only, not resource-specific
5. **Limited Audit UI**: Audit logs exist but lack comprehensive viewing/export capabilities

---

## 2. Design Principles

### 2.1 User Experience
- **Clean & Uncluttered**: Minimalist design with progressive disclosure
- **International-Ready**: Support for multiple languages and RTL layouts
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-first design approach
- **Consistent**: Follow existing Shadcn UI patterns

### 2.2 Security-First
- **Principle of Least Privilege**: Default to minimal permissions
- **Visual Indicators**: Clear role badges and permission indicators
- **Confirmation Dialogs**: For all destructive actions
- **Audit Trail**: All actions logged and visible

### 2.3 Enterprise Features
- **Bulk Operations**: Support for bulk user management
- **Export Capabilities**: CSV/PDF export for reports and logs
- **Advanced Filtering**: Multi-criteria filtering and search
- **Real-time Updates**: Live status updates using Supabase subscriptions

---

## 3. Role Hierarchy & Structure

### 3.1 Role Definitions

```
┌─────────────────────────────────────────┐
│         Super User (1 only)            │
│  - Full system access                   │
│  - Can manage all roles                 │
│  - Bypass all restrictions              │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼──────────┐
│   Admin        │    │  Content Developer │
│  - User mgmt   │    │  - Content creation│
│  - System cfg  │    │  - Content review  │
└───────┬────────┘    └────────────────────┘
        │
        ├─── Project Manager
        │    - Project oversight
        │    - Resource allocation
        │
        ├─── School Officer
        │    - School-level admin
        │    - Teacher management
        │
        ├─── Principal
        │    - School leadership
        │    - Student oversight
        │
        ├─── Teacher
        │    - Course management
        │    - Student grading
        │
        └─── Student
             - Course enrollment
             - Assignment submission
```

### 3.2 Role Permissions Matrix (Conceptual)

| Resource | Super User | Admin | Content Dev | Proj Mgr | School Officer | Principal | Teacher | Student |
|----------|-----------|-------|-------------|----------|----------------|-----------|---------|---------|
| **User Management** |
| Create Users | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Edit Users | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Delete Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign Roles | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **Content Management** |
| Create Courses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit Courses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ |
| Delete Courses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅* | ❌ |
| Publish Courses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System Settings** |
| Security Config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| RBAC Config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Limited scope (e.g., School Officer can only manage teachers/students in their school)

---

## 4. Front-End Architecture

### 4.1 Component Structure

```
src/
├── components/
│   ├── rbac/
│   │   ├── RoleManagement/
│   │   │   ├── RoleManagement.tsx          # Main role management page
│   │   │   ├── RoleCard.tsx                # Individual role display card
│   │   │   ├── RolePermissions.tsx         # Permission matrix view
│   │   │   └── RoleHierarchy.tsx           # Visual hierarchy tree
│   │   ├── PermissionManager/
│   │   │   ├── PermissionManager.tsx       # Granular permission editor
│   │   │   ├── PermissionMatrix.tsx        # Resource × Role matrix
│   │   │   ├── PermissionToggle.tsx        # Individual permission toggle
│   │   │   └── ResourceSelector.tsx        # Resource type selector
│   │   ├── SignUpWorkflow/
│   │   │   ├── SignUpApprovalQueue.tsx     # Pending approvals list
│   │   │   ├── ApprovalWorkflow.tsx        # Multi-tier approval UI
│   │   │   ├── ApprovalCard.tsx            # Individual approval item
│   │   │   └── ApprovalHistory.tsx         # Approval timeline
│   │   ├── PasswordPolicies/
│   │   │   ├── PasswordPolicyManager.tsx   # Policy configuration
│   │   │   ├── PolicyEditor.tsx             # Individual policy editor
│   │   │   ├── PasswordComplexity.tsx      # Complexity requirements UI
│   │   │   └── PasswordExpiration.tsx       # Expiration settings
│   │   └── AuditLogs/
│   │       ├── AuditLogViewer.tsx           # Main audit log viewer
│   │       ├── AuditLogFilters.tsx          # Advanced filtering
│   │       ├── AuditLogTable.tsx            # Log entries table
│   │       └── AuditLogExport.tsx           # Export functionality
│   └── admin/
│       └── Settings/
│           ├── RBACSettings.tsx             # RBAC settings page
│           └── SecuritySettings.tsx         # Enhanced security page
├── pages/
│   └── admin/
│       ├── RBACManagement.tsx              # Main RBAC management page
│       └── UserApprovals.tsx                # Sign-up approval page
├── services/
│   ├── rbacService.ts                      # RBAC API calls
│   ├── permissionService.ts                # Permission management
│   ├── approvalService.ts                   # Approval workflow
│   └── passwordPolicyService.ts             # Password policy management
├── hooks/
│   ├── usePermissions.ts                    # Permission checking hook
│   ├── useRoleManagement.ts                 # Role management hook
│   └── useApprovalWorkflow.ts               # Approval workflow hook
└── types/
    └── rbac.ts                              # TypeScript types for RBAC
```

### 4.2 Page Structure

#### 4.2.1 Main RBAC Management Page
**Route**: `/dashboard/rbac-management`
**Access**: Super User, Admin

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  RBAC Management                    [Export] [Help]  │
├─────────────────────────────────────────────────────┤
│  [Roles] [Permissions] [Approvals] [Policies]       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Tab Content - Role Management by default]         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 4.2.2 Settings & Security Page Enhancement
**Route**: `/dashboard/admin-settings`
**Access**: Super User, Admin

**New Tabs**:
- **General Settings** (existing)
- **Security** (existing, enhanced)
- **RBAC Configuration** (new)
- **Password Policies** (new)
- **Audit Logs** (new)

---

## 5. Detailed Feature Designs

### 5.1 Multi-Level Role-Based Access Control

#### 5.1.1 Role Management Interface

**Component**: `RoleManagement.tsx`

**Features**:
- **Role List View**: Card-based or table view of all roles
- **Role Details**: Click to expand and see permissions
- **Role Creation**: Modal dialog for creating custom roles (if allowed)
- **Role Hierarchy Visualization**: Tree view showing role relationships
- **Role Assignment**: Quick assign role to users

**UI Design**:
```tsx
// Role Card Example
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="outline">Principal</Badge>
        <span className="text-sm text-muted-foreground">12 users</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger>⋮</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
          <DropdownMenuItem>View Users</DropdownMenuItem>
          <DropdownMenuItem>Export Role</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground mb-4">
      School leadership role with oversight capabilities
    </p>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Can manage teachers</span>
        <Check className="w-4 h-4 text-green-500" />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Can view all students</span>
        <Check className="w-4 h-4 text-green-500" />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Can delete courses</span>
        <X className="w-4 h-4 text-red-500" />
      </div>
    </div>
  </CardContent>
</Card>
```

**Permissions View**:
- **Matrix View**: Resource × Role grid with checkboxes
- **Tree View**: Hierarchical permission structure
- **List View**: Detailed permission list with descriptions

#### 5.1.2 Permission Matrix Component

**Component**: `PermissionMatrix.tsx`

**Features**:
- **Resource Types**: Courses, Users, Classes, Reports, Settings, etc.
- **Actions**: Read, Write, Delete, Execute
- **Visual Indicators**: Color-coded cells (green = allowed, red = denied, gray = inherited)
- **Bulk Edit**: Select multiple cells and apply permission
- **Export**: Export permission matrix as CSV/PDF

**UI Design**:
```
┌─────────────┬──────┬──────┬──────┬──────┬──────┐
│ Resource    │ Read │Write │Delete│Exec  │Notes │
├─────────────┼──────┼──────┼──────┼──────┼──────┤
│ Courses     │  ✅  │  ✅  │  ❌  │  ✅  │      │
│ Users       │  ✅  │  ✅  │  ❌  │  ❌  │      │
│ Reports     │  ✅  │  ❌  │  ❌  │  ❌  │      │
└─────────────┴──────┴──────┴──────┴──────┴──────┘
```

### 5.2 Controlled Sign-Up Workflows

#### 5.2.1 Approval Queue Interface

**Component**: `SignUpApprovalQueue.tsx`

**Features**:
- **Pending Approvals**: List of users awaiting approval
- **Approval Levels**: Visual indicator of approval stage
- **Bulk Approval**: Approve/reject multiple users
- **User Details**: Expandable cards showing user information
- **Approval History**: Timeline of approval actions

**Approval Workflow States**:
1. **Submitted** → Awaiting first approver
2. **Level 1 Approved** → Awaiting second approver
3. **Level 2 Approved** → Awaiting final approver
4. **Approved** → User can access system
5. **Rejected** → User notified, can resubmit

**UI Design**:
```tsx
// Approval Card
<Card className="border-l-4 border-l-yellow-500">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <h3>John Doe</h3>
        <p className="text-sm text-muted-foreground">john.doe@school.edu</p>
      </div>
      <Badge>Pending Level 1</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Requested Role: Teacher</p>
        <p className="text-sm text-muted-foreground">Submitted: 2 days ago</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="default">Approve</Button>
        <Button size="sm" variant="outline">Reject</Button>
        <Button size="sm" variant="ghost">View Details</Button>
      </div>
    </div>
  </CardContent>
</Card>
```

**Approval Timeline**:
```
┌─────────────────────────────────────────┐
│  Approval Timeline                      │
├─────────────────────────────────────────┤
│  ✓ Level 1: School Officer             │
│    Approved by: Jane Smith              │
│    Date: 2025-01-15 10:30 AM           │
├─────────────────────────────────────────┤
│  ⏳ Level 2: Principal                  │
│    Awaiting: John Principal             │
├─────────────────────────────────────────┤
│  ⏸ Level 3: Admin                      │
│    Not started                          │
└─────────────────────────────────────────┘
```

#### 5.2.2 Approval Configuration

**Component**: `ApprovalWorkflowConfig.tsx`

**Features**:
- **Configure Approval Levels**: Set number of required approvals
- **Assign Approvers**: Map roles to approval levels
- **Role-Based Routing**: Different approval paths for different roles
- **Auto-Approval Rules**: Conditions for automatic approval

**Example Configuration**:
- **Student Sign-up**: 1 approval (Teacher or Principal)
- **Teacher Sign-up**: 2 approvals (Principal → Admin)
- **Admin Sign-up**: 3 approvals (Super User only)

### 5.3 Administrative Password Controls

#### 5.3.1 Password Policy Manager

**Component**: `PasswordPolicyManager.tsx`

**Features**:
- **Complexity Requirements**:
  - Minimum length (8-128 characters)
  - Require uppercase letters
  - Require lowercase letters
  - Require numbers
  - Require special characters
  - Prevent common passwords
  - Prevent username in password
- **Expiration Policies**:
  - Password expiration period (days)
  - Warning period before expiration
  - Grace period after expiration
  - Force change on first login
- **Reset Mechanisms**:
  - Self-service password reset
  - Admin-initiated reset
  - Temporary password generation
  - Password history (prevent reuse)

**UI Design**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Password Complexity Requirements</CardTitle>
    <CardDescription>
      Configure password strength requirements for all users
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Minimum Length</Label>
          <p className="text-sm text-muted-foreground">
            Minimum number of characters required
          </p>
        </div>
        <Input type="number" min="8" max="128" defaultValue="12" />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Require Uppercase Letters</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label>Require Lowercase Letters</Label>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label>Require Numbers</Label>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label>Require Special Characters</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label>Prevent Common Passwords</Label>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

**Password Expiration Settings**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Password Expiration</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Expiration Period</Label>
          <p className="text-sm text-muted-foreground">
            Days before password expires
          </p>
        </div>
        <Input type="number" min="0" max="365" defaultValue="90" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>Warning Period</Label>
          <p className="text-sm text-muted-foreground">
            Days before expiration to show warning
          </p>
        </div>
        <Input type="number" min="0" max="30" defaultValue="7" />
      </div>
      <div className="flex items-center justify-between">
        <Label>Force Change on First Login</Label>
        <Switch />
      </div>
    </div>
  </CardContent>
</Card>
```

#### 5.3.2 Password Reset Interface

**Component**: `PasswordResetManager.tsx`

**Features**:
- **User Search**: Search users by email/name
- **Reset Options**: 
  - Send reset link via email
  - Generate temporary password
  - Force password change on next login
- **Reset History**: Track all password resets
- **Bulk Reset**: Reset passwords for multiple users

### 5.4 Granular Permission Controls

#### 5.4.1 Permission Manager Interface

**Component**: `PermissionManager.tsx`

**Features**:
- **Resource-Based Permissions**: 
  - Courses (create, read, update, delete, publish)
  - Users (create, read, update, delete, assign role)
  - Classes (create, read, update, delete, enroll)
  - Reports (view, export, generate)
  - Settings (view, edit)
- **Role-Based Permissions**: Permissions per role
- **User-Specific Overrides**: Override role permissions for specific users
- **Permission Inheritance**: Visualize permission inheritance
- **Permission Templates**: Save and reuse permission sets

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│  Permission Manager                                 │
├─────────────────────────────────────────────────────┤
│  [By Role] [By Resource] [By User]                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Role: Principal                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Resource: Courses                            │  │
│  │  ☑ Read    ☑ Write    ☐ Delete    ☑ Publish │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Resource: Users                               │  │
│  │  ☑ Read    ☑ Write    ☐ Delete    ☐ Assign  │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Permission Override Dialog**:
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Override Permissions for User</DialogTitle>
      <DialogDescription>
        Set specific permissions that override role defaults
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select Resource" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="courses">Courses</SelectItem>
          <SelectItem value="users">Users</SelectItem>
          {/* ... */}
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Read</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label>Write</Label>
          <Switch />
        </div>
        {/* ... */}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 5.5 Audit Logging

#### 5.5.1 Audit Log Viewer

**Component**: `AuditLogViewer.tsx`

**Features**:
- **Advanced Filtering**:
  - Date range picker
  - User filter (search by email/name)
  - Role filter
  - Action type filter
  - Status filter (success/failed)
  - IP address filter
  - Resource type filter
- **Real-time Updates**: Live log streaming
- **Export Options**: CSV, PDF, JSON
- **Detailed View**: Expandable rows showing full metadata
- **Search**: Full-text search across all log fields

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│  Audit Logs                    [Export] [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Filters:                                          │
│  [Date Range ▼] [User ▼] [Role ▼] [Action ▼]      │
│  [Search...]                                       │
├─────────────────────────────────────────────────────┤
│  Timestamp    │ User        │ Action      │ Status │
├───────────────┼─────────────┼─────────────┼─────────┤
│  2025-01-15   │ admin@...   │ User Created│ Success│
│  10:30 AM     │             │             │        │
│               │             │             │        │
│  [Expand ▼]   │             │             │        │
└─────────────────────────────────────────────────────┘
```

**Log Entry Detail View**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Log Entry Details</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label>Action</Label>
        <p>User Created</p>
      </div>
      <div>
        <Label>User</Label>
        <p>admin@school.edu</p>
      </div>
      <div>
        <Label>Target User</Label>
        <p>newuser@school.edu</p>
      </div>
      <div>
        <Label>IP Address</Label>
        <p>192.168.1.100</p>
      </div>
      <div>
        <Label>Metadata</Label>
        <pre className="bg-muted p-4 rounded">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>
    </div>
  </CardContent>
</Card>
```

#### 5.5.2 Audit Log Analytics

**Component**: `AuditLogAnalytics.tsx`

**Features**:
- **Activity Charts**: 
  - Actions over time (line chart)
  - Actions by role (bar chart)
  - Failed actions (pie chart)
- **Security Insights**:
  - Failed login attempts
  - Unusual access patterns
  - Permission changes
- **Compliance Reports**:
  - User access reports
  - Data access reports
  - System changes log

---

## 6. Navigation Integration

### 6.1 Admin Portal Navigation Updates

**File**: `src/config/roleNavigation.ts`

**New Navigation Items**:
```typescript
case 'admin':
case 'super_user':
  return [
    // ... existing items
    {
      title: 'SYSTEM',
      items: [
        // ... existing items
        { title: 'RBAC Management', path: '/dashboard/rbac-management', icon: Shield },
        { title: 'User Approvals', path: '/dashboard/user-approvals', icon: UserCheck },
        { title: 'Settings and Security', path: '/dashboard/admin-settings', icon: Settings },
      ]
    }
  ];
```

### 6.2 Route Protection

**File**: `src/pages/Dashboard.tsx`

**New Routes**:
```typescript
<Route 
  path="/rbac-management" 
  element={
    <RoleGuard allowedRoles={['super_user', 'admin']}>
      <RBACManagement />
    </RoleGuard>
  } 
/>
<Route 
  path="/user-approvals" 
  element={
    <RoleGuard allowedRoles={['super_user', 'admin', 'school_officer', 'principal']}>
      <UserApprovals />
    </RoleGuard>
  } 
/>
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema updates for new roles
- [ ] TypeScript type definitions
- [ ] Basic RBAC service layer
- [ ] Role management UI (basic)

### Phase 2: Core Features (Week 3-4)
- [ ] Permission matrix component
- [ ] Granular permission editor
- [ ] Sign-up approval workflow UI
- [ ] Password policy manager

### Phase 3: Advanced Features (Week 5-6)
- [ ] Audit log viewer with filtering
- [ ] Approval timeline component
- [ ] Permission inheritance visualization
- [ ] Export functionality

### Phase 4: Polish & Testing (Week 7-8)
- [ ] UI/UX refinements
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation

---

## 8. Technical Considerations

### 8.1 Performance
- **Virtual Scrolling**: For large lists (roles, users, logs)
- **Pagination**: All data tables paginated
- **Lazy Loading**: Load permission details on demand
- **Caching**: Cache role/permission data using TanStack Query

### 8.2 Security
- **Client-Side Validation**: Immediate feedback
- **Server-Side Validation**: All changes validated on backend
- **RLS Policies**: Database-level enforcement
- **Rate Limiting**: Prevent abuse of approval/reset features

### 8.3 Internationalization
- **i18n Ready**: All text in translation keys
- **RTL Support**: Layout adapts for RTL languages
- **Date/Time Formatting**: Locale-aware formatting

### 8.4 Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: WCAG AA compliant
- **Focus Management**: Clear focus indicators

---

## 9. Component Specifications

### 9.1 Key Components

#### RoleManagement.tsx
- **Props**: `{ onRoleSelect?: (role: Role) => void }`
- **State**: Roles list, selected role, loading state
- **Features**: CRUD operations, role assignment

#### PermissionMatrix.tsx
- **Props**: `{ roleId: string, onPermissionChange: (resource, action, allowed) => void }`
- **State**: Permission matrix data, editing state
- **Features**: Visual matrix, bulk edit, export

#### SignUpApprovalQueue.tsx
- **Props**: `{ approvalLevel?: number }`
- **State**: Pending approvals, filters
- **Features**: Approve/reject, bulk operations, history

#### PasswordPolicyManager.tsx
- **Props**: `{ policy: PasswordPolicy, onSave: (policy) => void }`
- **State**: Policy configuration, validation errors
- **Features**: Policy editor, preview, test

#### AuditLogViewer.tsx
- **Props**: `{ filters?: AuditFilters, realTime?: boolean }`
- **State**: Log entries, filters, pagination
- **Features**: Filtering, export, real-time updates

---

## 10. Data Models

### 10.1 TypeScript Types

```typescript
// src/types/rbac.ts

export type AppRole = 
  | 'super_user'
  | 'admin'
  | 'content_developer'
  | 'project_manager'
  | 'school_officer'
  | 'principal'
  | 'teacher'
  | 'student';

export type ResourceType = 
  | 'courses'
  | 'users'
  | 'classes'
  | 'reports'
  | 'settings'
  | 'content'
  | 'assignments';

export type PermissionAction = 'read' | 'write' | 'delete' | 'execute';

export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  allowed: boolean;
  roleId: string;
  userId?: string; // For user-specific overrides
}

export interface Role {
  id: string;
  name: AppRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  parentRoleId?: string;
  isSystemRole: boolean;
  userCount: number;
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  requestedRole: AppRole;
  status: 'pending' | 'approved' | 'rejected';
  currentLevel: number;
  totalLevels: number;
  approvers: ApprovalStep[];
  submittedAt: string;
  metadata: Record<string, any>;
}

export interface ApprovalStep {
  level: number;
  approverRole: AppRole;
  approverId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  comments?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUsernameInPassword: boolean;
  expirationDays: number;
  warningDays: number;
  forceChangeOnFirstLogin: boolean;
  preventReuseCount: number;
  allowSelfServiceReset: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType?: ResourceType;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'pending';
  metadata: Record<string, any>;
  createdAt: string;
}
```

---

## 11. API Integration

### 11.1 Service Layer

```typescript
// src/services/rbacService.ts

export class RBACService {
  static async getRoles(): Promise<Role[]>
  static async getRole(roleId: string): Promise<Role>
  static async createRole(role: Partial<Role>): Promise<Role>
  static async updateRole(roleId: string, updates: Partial<Role>): Promise<Role>
  static async deleteRole(roleId: string): Promise<void>
  static async assignRoleToUser(userId: string, roleId: string): Promise<void>
}

// src/services/permissionService.ts

export class PermissionService {
  static async getPermissions(roleId: string): Promise<Permission[]>
  static async updatePermission(permissionId: string, allowed: boolean): Promise<Permission>
  static async bulkUpdatePermissions(updates: PermissionUpdate[]): Promise<void>
  static async getUserOverrides(userId: string): Promise<Permission[]>
  static async setUserOverride(userId: string, permission: Permission): Promise<void>
}

// src/services/approvalService.ts

export class ApprovalService {
  static async getPendingApprovals(level?: number): Promise<ApprovalRequest[]>
  static async approveRequest(requestId: string, level: number, comments?: string): Promise<void>
  static async rejectRequest(requestId: string, level: number, reason: string): Promise<void>
  static async getApprovalHistory(requestId: string): Promise<ApprovalStep[]>
}

// src/services/passwordPolicyService.ts

export class PasswordPolicyService {
  static async getPolicy(): Promise<PasswordPolicy>
  static async updatePolicy(policy: Partial<PasswordPolicy>): Promise<PasswordPolicy>
  static async validatePassword(password: string, username?: string): Promise<ValidationResult>
  static async resetUserPassword(userId: string, method: 'email' | 'temporary'): Promise<void>
}
```

---

## 12. User Experience Flow

### 12.1 Admin Managing Roles

1. Navigate to **RBAC Management** from sidebar
2. View role list with user counts
3. Click on a role to see details
4. Edit permissions using matrix view
5. Save changes (confirmation dialog)
6. See audit log entry created

### 12.2 User Sign-Up Approval

1. User signs up → Request created
2. First approver sees notification
3. Approver reviews request details
4. Approver approves/rejects
5. If approved, moves to next level
6. Final approval → User activated
7. User receives notification email

### 12.3 Setting Password Policies

1. Navigate to **Settings → Password Policies**
2. Configure complexity requirements
3. Set expiration period
4. Enable/disable features
5. Preview policy requirements
6. Save changes
7. Existing users notified if policy changed

---

## 13. Visual Design Guidelines

### 13.1 Color Scheme
- **Primary**: Existing brand colors
- **Success**: Green for approved/allowed
- **Warning**: Yellow for pending
- **Error**: Red for rejected/denied
- **Info**: Blue for informational

### 13.2 Typography
- **Headings**: Inter/Sans-serif, bold
- **Body**: Inter/Sans-serif, regular
- **Code/Monospace**: For technical data

### 13.3 Spacing
- **Card Padding**: 24px
- **Section Spacing**: 32px
- **Element Spacing**: 16px
- **Compact Mode**: Reduced spacing for dense data

### 13.4 Icons
- **Roles**: Shield, User, Users, etc. (Lucide React)
- **Actions**: Check, X, Edit, Trash, etc.
- **Status**: Circle with fill for status indicators

---

## 14. Testing Strategy

### 14.1 Unit Tests
- Component rendering
- Permission calculations
- Validation logic
- Service functions

### 14.2 Integration Tests
- API integration
- Database operations
- Workflow completion
- Error handling

### 14.3 E2E Tests
- Complete user flows
- Approval workflows
- Permission changes
- Audit logging

### 14.4 Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast
- ARIA labels

---

## 15. Success Metrics

### 15.1 User Experience
- Time to complete common tasks
- Error rate
- User satisfaction scores

### 15.2 Performance
- Page load times
- API response times
- Real-time update latency

### 15.3 Security
- Failed access attempts
- Approval processing time
- Audit log completeness

---

## 16. Future Enhancements

### 16.1 Phase 2 Features
- **Custom Roles**: Allow admins to create custom roles
- **Permission Templates**: Reusable permission sets
- **Role Cloning**: Duplicate existing roles
- **Bulk Role Assignment**: Assign roles to multiple users
- **Permission Analytics**: Usage statistics

### 16.2 Advanced Features
- **Time-Based Permissions**: Permissions that expire
- **Conditional Permissions**: Permissions based on conditions
- **Delegation**: Temporary permission delegation
- **Workflow Automation**: Automated approval rules

---

## Conclusion

This design plan provides a comprehensive roadmap for implementing enterprise-level RBAC features in the LMS platform. The design emphasizes:

1. **Clean, uncluttered UI** that scales to enterprise needs
2. **Comprehensive RBAC** with multi-level roles and granular permissions
3. **Controlled workflows** for user onboarding
4. **Strong security** with password policies and audit logging
5. **International readiness** with i18n support

The implementation should follow an iterative approach, starting with core features and gradually adding advanced capabilities based on user feedback and requirements.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Author**: AI Assistant  
**Status**: Draft for Review

