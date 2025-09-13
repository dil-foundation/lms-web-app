# Discussion View Toggle System

## 🎯 **Overview**

A comprehensive view toggle system for the Discussions page that allows users to switch between different display modes (Card, Tile, List) for browsing discussions. This enhances user experience by providing flexible viewing options that suit different preferences and use cases.

## ✨ **Features**

### **Three View Modes**
- **Card View** - Large, detailed cards with full discussion information
- **Tile View** - Compact tiles for quick browsing and overview
- **List View** - Dense list format with essential information and actions

### **Discussion-Specific Features**
- **Engagement metrics** - Reply counts, like counts, and activity indicators
- **Moderation controls** - Edit, delete, and pin functionality for moderators
- **Author information** - Creator details and timestamps
- **Discussion types** - Visual badges for different discussion categories
- **Course context** - Course-specific discussion indicators

### **Responsive Design**
- **Mobile-optimized** - Adapts to different screen sizes
- **Touch-friendly** - Easy interaction on all devices
- **Accessible** - Proper ARIA labels and keyboard navigation

## 🏗️ **Architecture**

### **Core Components**

#### **DiscussionTileView Component**
```typescript
// src/components/discussion/DiscussionTileView.tsx
- Compact tile layout for discussions
- 4-column responsive grid (1 on mobile, 2 on tablet, 3-4 on desktop)
- Essential information only with quick actions
- Perfect for overview scanning and quick navigation
```

#### **DiscussionListView Component**
```typescript
// src/components/discussion/DiscussionListView.tsx
- Dense horizontal layout with detailed information
- Single column with discussion stats and moderation controls
- Author information and last activity dates
- Perfect for moderators and detailed analysis
```

#### **View Preferences Integration**
```typescript
// src/contexts/ViewPreferencesContext.tsx
- Added discussionView preference
- Persistent storage across sessions
- Per-role preference tracking
- Type-safe implementation
```

## 🎨 **View Modes Explained**

### **Card View (Default)**
- **Layout**: Single column with large cards
- **Information**: Full discussion details, content preview, engagement stats
- **Best for**: Detailed browsing, reading discussions
- **Features**: 
  - Large discussion cards with full content preview
  - Complete engagement metrics
  - Author information and timestamps
  - Moderation controls for authorized users

### **Tile View**
- **Layout**: 4-column responsive grid
- **Information**: Essential discussion details only
- **Best for**: Quick browsing, overview scanning
- **Features**:
  - Square aspect ratio cards
  - Compact information display
  - Quick action buttons
  - Discussion type and course badges

### **List View**
- **Layout**: Single column list
- **Information**: Detailed information in horizontal layout
- **Best for**: Moderating discussions, comparing content
- **Features**:
  - Horizontal discussion cards
  - Engagement stats and moderation controls
  - Author information and activity dates
  - Pin/unpin functionality

## 🔧 **Implementation Details**

### **Discussion Data Structure**
```typescript
interface Discussion {
  id: string;
  title: string;
  content: string;
  discussion_type?: string;
  course_title?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  creator_id: string;
  created_at: string;
  replies_count: number;
  likes_count: number;
  is_pinned?: boolean;
  last_activity?: string;
}
```

### **View Component Props**
```typescript
interface DiscussionViewProps {
  discussions: Discussion[];
  onDiscussionClick?: (discussion: Discussion) => void;
  onLike?: (discussionId: string) => void;
  onEdit?: (discussion: Discussion) => void;
  onDelete?: (discussionId: string) => void;
  onPin?: (discussionId: string) => void;
  canModerate?: boolean;
  className?: string;
}
```

### **Responsive Grid System**
```css
/* Tile View */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

/* List View */
space-y-2 (single column)

/* Card View */
space-y-4 (single column)
```

## 📱 **Responsive Behavior**

### **Mobile (< 640px)**
- **Card View**: Single column, full width
- **Tile View**: 1 column
- **List View**: Full width with compact layout

### **Tablet (640px - 1024px)**
- **Card View**: Single column, full width
- **Tile View**: 2 columns
- **List View**: Full width with standard layout

### **Desktop (> 1024px)**
- **Card View**: Single column, full width
- **Tile View**: 3-4 columns
- **List View**: Full width with detailed layout

## 🎯 **Usage Examples**

### **Basic Implementation**
```tsx
import { ViewToggle, useViewPreferences } from '@/components/ui/ViewToggle';
import { DiscussionTileView, DiscussionListView } from '@/components/discussion';

const DiscussionsPage = () => {
  const { preferences, setDiscussionView } = useViewPreferences();
  
  return (
    <div>
      <ViewToggle
        currentView={preferences.discussionView}
        onViewChange={setDiscussionView}
        availableViews={['card', 'tile', 'list']}
      />
      
      {preferences.discussionView === 'tile' && (
        <DiscussionTileView
          discussions={discussions}
          onDiscussionClick={handleDiscussionClick}
          canModerate={canModerate}
        />
      )}
      
      {preferences.discussionView === 'list' && (
        <DiscussionListView
          discussions={discussions}
          onDiscussionClick={handleDiscussionClick}
          canModerate={canModerate}
        />
      )}
    </div>
  );
};
```

### **Moderation Features**
```tsx
<DiscussionListView
  discussions={discussions}
  onEdit={(discussion) => setEditingDiscussion(discussion)}
  onDelete={(discussionId) => setDiscussionToDelete({ id: discussionId })}
  onPin={(discussionId) => handlePinDiscussion(discussionId)}
  canModerate={profile?.role === 'admin' || profile?.role === 'teacher'}
/>
```

## 🎨 **Visual Design**

### **Tile View Design**
- **Compact cards** with essential information
- **Square aspect ratio** for consistent layout
- **Badge system** for discussion types and courses
- **Quick action buttons** for engagement and moderation

### **List View Design**
- **Horizontal layout** with avatar and content
- **Detailed information** with engagement stats
- **Moderation controls** in dropdown menus
- **Status indicators** for pinned discussions

### **Card View Design**
- **Large, detailed cards** with full content preview
- **Engagement metrics** prominently displayed
- **Author information** with avatars
- **Hover effects** and smooth transitions

## 🔒 **Moderation Features**

### **Available Actions**
- **Edit Discussion** - Modify title, content, and settings
- **Delete Discussion** - Remove discussion and all replies
- **Pin/Unpin** - Pin important discussions to top
- **Like/Unlike** - Engage with discussions

### **Permission System**
```typescript
const canModerate = !isProfileLoading && (
  profile?.role === 'admin' || 
  profile?.role === 'teacher'
);
```

### **Action Handlers**
```typescript
const handleEdit = (discussion: Discussion) => {
  setEditingDiscussion(discussion);
  setIsNewDiscussionOpen(true);
};

const handleDelete = (discussionId: string) => {
  setDiscussionToDelete({ id: discussionId });
};

const handlePin = (discussionId: string) => {
  // Toggle pin status
  togglePinDiscussion(discussionId);
};
```

## 📊 **Engagement Metrics**

### **Displayed Information**
- **Reply Count** - Number of replies to discussion
- **Like Count** - Number of likes received
- **Last Activity** - Most recent activity timestamp
- **Creation Date** - When discussion was created
- **Author Information** - Creator name and avatar

### **Visual Indicators**
- **Icons** - MessageCircle for replies, ThumbsUp for likes
- **Color coding** - Different colors for different metrics
- **Hover effects** - Interactive feedback on engagement
- **Progress indicators** - Visual representation of activity

## 🚀 **Performance Optimizations**

### **Efficient Rendering**
- **Conditional rendering** - Only active view is rendered
- **Memoization** - Prevent unnecessary re-renders
- **Lazy loading** - Load view components on demand
- **Optimized images** - Efficient avatar and image handling

### **State Management**
- **Context-based** global state management
- **LocalStorage persistence** for user preferences
- **Efficient updates** - Minimal re-renders
- **Error boundaries** - Graceful error handling

## ♿ **Accessibility Features**

### **Keyboard Navigation**
- **Tab navigation** - All interactive elements are focusable
- **Enter/Space activation** - Standard button behavior
- **Arrow key support** - Navigation between discussions

### **Screen Reader Support**
- **ARIA labels** - Descriptive labels for all elements
- **Role attributes** - Proper semantic roles
- **State announcements** - Active state communicated

### **Visual Accessibility**
- **High contrast** - Meets WCAG guidelines
- **Focus indicators** - Clear focus states
- **Color coding** - Not the only way to convey information

## 📈 **User Experience Benefits**

### **Flexibility**
- **Personal preference** - Users choose their preferred view
- **Context switching** - Different views for different tasks
- **Responsive design** - Optimal experience on all devices

### **Efficiency**
- **Quick browsing** - Tile view for overview
- **Detailed analysis** - List view for moderation
- **Engagement** - Card view for reading

### **Moderation**
- **Bulk actions** - Easy management of multiple discussions
- **Quick access** - Fast edit and delete operations
- **Status management** - Pin/unpin functionality

## 🎓 **Best Practices**

### **For Developers**
1. **Use appropriate views** - Match view to use case
2. **Maintain consistency** - Same interaction patterns
3. **Test all views** - Ensure functionality across modes
4. **Optimize performance** - Lazy load when possible

### **For Users**
1. **Try different views** - Find what works best
2. **Use context appropriately** - Tile for browsing, list for moderation
3. **Leverage preferences** - System remembers your choices
4. **Provide feedback** - Report issues or suggestions

## 📋 **Implementation Checklist**

### **Completed Features**
- ✅ DiscussionTileView component with compact layout
- ✅ DiscussionListView component with detailed layout
- ✅ ViewPreferencesContext integration
- ✅ DiscussionsPage view toggle integration
- ✅ Responsive design for all screen sizes
- ✅ Moderation controls and permissions
- ✅ Engagement metrics display
- ✅ Accessibility features

### **Future Enhancements**
- ⏳ Advanced filtering per view
- ⏳ Bulk actions in list view
- ⏳ Custom view configurations
- ⏳ Discussion analytics
- ⏳ Real-time updates

## 🎯 **Use Cases**

### **Students**
- **Card View**: Best for reading and engaging with discussions
- **Tile View**: Perfect for quick browsing of course discussions
- **List View**: Ideal for tracking participation across discussions

### **Teachers**
- **Card View**: Great for moderating and responding to discussions
- **Tile View**: Quick overview of all course discussions
- **List View**: Detailed management and analysis of discussions

### **Admins**
- **Card View**: Comprehensive view for platform-wide moderation
- **Tile View**: Quick overview of all discussions
- **List View**: Advanced moderation and bulk operations

This discussion view toggle system provides a flexible, user-friendly way to browse and manage discussions with multiple viewing options that adapt to different user roles and use cases.
