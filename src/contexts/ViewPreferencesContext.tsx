import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ViewMode = 'card' | 'tile' | 'list';

interface ViewPreferences {
  courseView: ViewMode;
  adminView: ViewMode;
  studentView: ViewMode;
  discussionView: ViewMode;
  progressView: ViewMode;
  assignmentView: ViewMode;
  teacherStudentView: ViewMode;
  teacherReportsView: ViewMode;
  teacherCourseView: ViewMode;
  teacherClassView: ViewMode;
  multitenancyView: ViewMode;
  observationReportsView: ViewMode;
  courseCategoriesView: ViewMode;
  ordersView: ViewMode;
}

interface ViewPreferencesContextType {
  preferences: ViewPreferences;
  setCourseView: (view: ViewMode) => void;
  setAdminView: (view: ViewMode) => void;
  setStudentView: (view: ViewMode) => void;
  setDiscussionView: (view: ViewMode) => void;
  setProgressView: (view: ViewMode) => void;
  setAssignmentView: (view: ViewMode) => void;
  setTeacherStudentView: (view: ViewMode) => void;
  setTeacherReportsView: (view: ViewMode) => void;
  setTeacherCourseView: (view: ViewMode) => void;
  setTeacherClassView: (view: ViewMode) => void;
  setMultitenancyView: (view: ViewMode) => void;
  setObservationReportsView: (view: ViewMode) => void;
  setCourseCategoriesView: (view: ViewMode) => void;
  setOrdersView: (view: ViewMode) => void;
  resetPreferences: () => void;
}

const defaultPreferences: ViewPreferences = {
  courseView: 'card',
  adminView: 'card',
  studentView: 'card',
  discussionView: 'card',
  progressView: 'card',
  assignmentView: 'card',
  teacherStudentView: 'card',
  teacherReportsView: 'card',
  teacherCourseView: 'card',
  teacherClassView: 'card',
  multitenancyView: 'list',
  observationReportsView: 'card',
  courseCategoriesView: 'card',
  ordersView: 'card'
};

const ViewPreferencesContext = createContext<ViewPreferencesContextType | undefined>(undefined);

interface ViewPreferencesProviderProps {
  children: ReactNode;
}

export const ViewPreferencesProvider: React.FC<ViewPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('view-preferences');
        if (saved) {
          return { ...defaultPreferences, ...JSON.parse(saved) };
        }
      } catch (error) {
        console.warn('Failed to load view preferences from localStorage:', error);
      }
    }
    return defaultPreferences;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('view-preferences', JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save view preferences to localStorage:', error);
      }
    }
  }, [preferences]);

  const setCourseView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, courseView: view }));
  };

  const setAdminView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, adminView: view }));
  };

  const setStudentView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, studentView: view }));
  };

  const setDiscussionView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, discussionView: view }));
  };

  const setProgressView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, progressView: view }));
  };

  const setAssignmentView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, assignmentView: view }));
  };

  const setTeacherStudentView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, teacherStudentView: view }));
  };

  const setTeacherReportsView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, teacherReportsView: view }));
  };

  const setTeacherCourseView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, teacherCourseView: view }));
  };

  const setTeacherClassView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, teacherClassView: view }));
  };

  const setMultitenancyView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, multitenancyView: view }));
  };

  const setObservationReportsView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, observationReportsView: view }));
  };

  const setCourseCategoriesView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, courseCategoriesView: view }));
  };

  const setOrdersView = (view: ViewMode) => {
    setPreferences(prev => ({ ...prev, ordersView: view }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  const value: ViewPreferencesContextType = {
    preferences,
    setCourseView,
    setAdminView,
    setStudentView,
    setDiscussionView,
    setProgressView,
    setAssignmentView,
    setTeacherStudentView,
    setTeacherReportsView,
    setTeacherCourseView,
    setTeacherClassView,
    setMultitenancyView,
    setObservationReportsView,
    setCourseCategoriesView,
    setOrdersView,
    resetPreferences
  };

  return (
    <ViewPreferencesContext.Provider value={value}>
      {children}
    </ViewPreferencesContext.Provider>
  );
};

export const useViewPreferences = (): ViewPreferencesContextType => {
  const context = useContext(ViewPreferencesContext);
  if (context === undefined) {
    throw new Error('useViewPreferences must be used within a ViewPreferencesProvider');
  }
  return context;
};
