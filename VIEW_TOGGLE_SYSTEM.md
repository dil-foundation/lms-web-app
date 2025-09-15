# View Toggle System for LMS Dashboard

## 🎯 **Overview**

A comprehensive view toggle system that allows users to switch between different display modes (Card, Tile, List) for course content across the LMS platform. This enhances user experience by providing flexible viewing options that suit different preferences and use cases.

## ✨ **Features**

### **Multiple View Modes**
- **Card View** - Large, detailed cards with full information
- **Tile View** - Compact tiles for quick browsing
- **List View** - Dense list format with essential information

### **Persistent Preferences**
- **LocalStorage integration** - Remembers user preferences
- **Context-based state management** - Shared across components
- **Per-role preferences** - Different views for students, teachers, admins

### **Responsive Design**
- **Mobile-optimized** - Adapts to different screen sizes
- **Touch-friendly** - Easy interaction on all devices
- **Accessible** - Proper ARIA labels and keyboard navigation

## 🏗️ **Architecture**

### **Core Components**

#### **ViewToggle Component**
```typescript
// src/components/ui/ViewToggle.tsx
- Flexible toggle component with customizable options
- Support for different view modes
- Compact and full versions available
- Preset configurations for different contexts
```

#### **View Preferences Context**
```typescript
// src/contexts/ViewPreferencesContext.tsx
- Global state management for view preferences
- LocalStorage persistence
- Per-role preference tracking
- Type-safe implementation
```

#### **View Components**
```typescript
// src/components/course/CourseTileView.tsx
- Compact tile layout for courses
- Optimized for quick browsing
- Grid-based responsive design

// src/components/course/CourseListView.tsx
- Dense list format
- Detailed information display
- Table-like layout with progress indicators
```

## 🎨 **View Modes Explained**

### **Card View (Default)**
- **Layout**: 3-column grid (responsive)
- **Information**: Full course details, progress bars, descriptions
- **Best for**: Detailed browsing, course selection
- **Features**: 
  - Large course images
  - Complete course information
  - Progress indicators
  - Action buttons

### **Tile View**
- **Layout**: 6-column grid (responsive)
- **Information**: Essential course details only
- **Best for**: Quick browsing, overview scanning
- **Features**:
  - Square aspect ratio images
  - Compact information display
  - Quick action buttons
  - Level and completion badges

### **List View**
- **Layout**: Single column list
- **Information**: Detailed information in horizontal layout
- **Best for**: Comparing courses, detailed analysis
- **Features**:
  - Horizontal course cards
  - Progress bars and statistics
  - Author information
  - Last accessed dates

## 🔧 **Implementation Details**

### **View Toggle Component**

```typescript
interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
  showLabels?: boolean;
  availableViews?: ViewMode[];
}
```

**Features:**
- **Icon-based buttons** with optional labels
- **Active state styling** with smooth transitions
- **Tooltip support** for accessibility
- **Customizable available views** per context

### **View Preferences Context**

```typescript
interface ViewPreferences {
  courseView: ViewMode;
  adminView: ViewMode;
  studentView: ViewMode;
}
```

**Features:**
- **Per-role preferences** - Students, teachers, and admins can have different defaults
- **LocalStorage persistence** - Preferences survive page refreshes
- **Type-safe updates** - Prevents invalid view modes
- **Error handling** - Graceful fallback to defaults

### **Responsive Grid System**

```css
/* Card View */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

/* Tile View */
grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6

/* List View */
space-y-2 (single column)
```

## 📱 **Responsive Behavior**

### **Mobile (< 640px)**
- **Card View**: 1 column
- **Tile View**: 2 columns
- **List View**: Full width

### **Tablet (640px - 1024px)**
- **Card View**: 2 columns
- **Tile View**: 3-4 columns
- **List View**: Full width

### **Desktop (> 1024px)**
- **Card View**: 3 columns
- **Tile View**: 5-6 columns
- **List View**: Full width

## 🎯 **Usage Examples**

### **Basic Implementation**
```tsx
import { ViewToggle, useViewPreferences } from '@/components/ui/ViewToggle';

const MyComponent = () => {
  const { preferences, setStudentView } = useViewPreferences();
  
  return (
    <div>
      <ViewToggle
        currentView={preferences.studentView}
        onViewChange={setStudentView}
        availableViews={['card', 'tile', 'list']}
      />
      {/* Render content based on view */}
    </div>
  );
};
```

### **Compact Version**
```tsx
import { ViewToggleCompact } from '@/components/ui/ViewToggle';

<ViewToggleCompact
  currentView={preferences.courseView}
  onViewChange={setCourseView}
/>
```

### **Preset Configurations**
```tsx
import { CourseViewToggle, AdminViewToggle } from '@/components/ui/ViewToggle';

// For course pages (card and tile only)
<CourseViewToggle
  currentView={preferences.courseView}
  onViewChange={setCourseView}
/>

// For admin pages (all views)
<AdminViewToggle
  currentView={preferences.adminView}
  onViewChange={setAdminView}
/>
```

## 🎨 **Styling and Theming**

### **Design System Integration**
- **Consistent with existing UI** - Matches current design language
- **Theme support** - Works with light/dark modes
- **Smooth transitions** - 200ms duration for all state changes
- **Hover effects** - Interactive feedback for better UX

### **Color Scheme**
```css
/* Active state */
bg-primary text-primary-foreground

/* Inactive state */
hover:bg-muted hover:text-foreground

/* Transitions */
transition-all duration-200
```

## ♿ **Accessibility Features**

### **Keyboard Navigation**
- **Tab navigation** - All buttons are focusable
- **Enter/Space activation** - Standard button behavior
- **Arrow key support** - Optional for future enhancement

### **Screen Reader Support**
- **ARIA labels** - Descriptive button labels
- **Role attributes** - Proper button roles
- **State announcements** - Active state communicated

### **Visual Indicators**
- **High contrast** - Meets WCAG guidelines
- **Focus indicators** - Clear focus states
- **Active states** - Obvious selection feedback

## 📊 **Performance Considerations**

### **Optimization Strategies**
- **Conditional rendering** - Only render active view
- **Memoization** - Prevent unnecessary re-renders
- **Lazy loading** - Load view components on demand
- **Efficient state updates** - Minimal re-renders

### **Bundle Size Impact**
- **Tree shaking** - Only import used components
- **Code splitting** - Lazy load view components
- **Minimal dependencies** - Lightweight implementation

## 🔄 **State Management**

### **Context Pattern**
```typescript
// Global state for view preferences
const ViewPreferencesContext = createContext<ViewPreferencesContextType>();

// Custom hook for easy access
const useViewPreferences = () => useContext(ViewPreferencesContext);
```

### **LocalStorage Integration**
```typescript
// Automatic persistence
useEffect(() => {
  localStorage.setItem('view-preferences', JSON.stringify(preferences));
}, [preferences]);

// Graceful fallback
const saved = localStorage.getItem('view-preferences');
return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
```

## 🚀 **Future Enhancements**

### **Planned Features**
1. **Custom view modes** - User-defined layouts
2. **View-specific filters** - Different filters per view
3. **Bulk actions** - Multi-select in list view
4. **Export options** - Export data in different formats
5. **View analytics** - Track usage patterns

### **Advanced Capabilities**
1. **Drag and drop** - Reorder items in list view
2. **Column customization** - Show/hide columns
3. **Sorting options** - Sort by different criteria
4. **Search integration** - Enhanced search per view
5. **Bookmarking** - Save favorite views

## 📈 **User Experience Benefits**

### **Flexibility**
- **Personal preference** - Users choose their preferred view
- **Context switching** - Different views for different tasks
- **Responsive design** - Optimal experience on all devices

### **Efficiency**
- **Quick browsing** - Tile view for overview
- **Detailed analysis** - List view for comparison
- **Visual appeal** - Card view for engagement

### **Accessibility**
- **Multiple ways to view** - Accommodates different needs
- **Consistent interaction** - Familiar patterns across views
- **Progressive enhancement** - Works without JavaScript

## 🎓 **Best Practices**

### **For Developers**
1. **Use appropriate views** - Match view to content type
2. **Maintain consistency** - Same interaction patterns
3. **Test all views** - Ensure functionality across modes
4. **Optimize performance** - Lazy load when possible

### **For Users**
1. **Try different views** - Find what works best
2. **Use context appropriately** - Tile for browsing, list for comparison
3. **Leverage preferences** - System remembers your choices
4. **Provide feedback** - Report issues or suggestions

## 📋 **Implementation Checklist**

### **Completed Features**
- ✅ ViewToggle component with multiple modes
- ✅ ViewPreferencesContext for state management
- ✅ CourseTileView for compact display
- ✅ CourseListView for detailed display
- ✅ StudentCourses integration
- ✅ LocalStorage persistence
- ✅ Responsive design
- ✅ Accessibility features

### **Pending Features**
- ⏳ Admin course management integration
- ⏳ Teacher dashboard integration
- ⏳ Advanced filtering per view
- ⏳ Custom view configurations
- ⏳ Usage analytics

This view toggle system provides a flexible, user-friendly way to browse course content with multiple viewing options that adapt to different user preferences and use cases.
