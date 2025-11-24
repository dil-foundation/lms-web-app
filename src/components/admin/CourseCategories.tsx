import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, BookCheck, Edit, Trash2, Eye, RefreshCw, Calendar, MoreHorizontal, Hash, Tag, Loader2, ChevronLeft, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { CourseCategoriesService, CourseCategory, PaginatedResponse, PaginationParams, SearchParams } from '@/services/courseCategoriesService';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { CategoryCardView } from '@/components/category/CategoryCardView';
import { CategoryTileView } from '@/components/category/CategoryTileView';
import { CategoryListView } from '@/components/category/CategoryListView';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useUserProfile } from '@/hooks/useUserProfile';

export const CourseCategories = () => {
  const { preferences, setCourseCategoriesView } = useViewPreferences();
  const { profile } = useUserProfile();
  const isViewOnly = profile?.role === 'view_only';
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<CourseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [courseCounts, setCourseCounts] = useState<Record<number, number>>({});
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10
  });
  const [paginationData, setPaginationData] = useState<PaginatedResponse<CourseCategory> | null>(null);
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 18;
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(getDefaultItemsPerPage(preferences.courseCategoriesView));
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Update items per page when view changes
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage(preferences.courseCategoriesView);
    setItemsPerPage(newItemsPerPage);
    setPagination(prev => ({ ...prev, limit: newItemsPerPage, page: 1 }));
  }, [preferences.courseCategoriesView]);

  // Load categories when pagination or search changes
  useEffect(() => {
    loadCategoriesPaginated();
  }, [pagination, debouncedSearchTerm]);

  // Load course counts for each category
  useEffect(() => {
    if (categories.length > 0) {
      loadCourseCounts();
    }
  }, [categories]);

  // Load categories with pagination and search
  const loadCategoriesPaginated = async () => {
    try {
      setLoading(true);
      const searchParams: SearchParams = debouncedSearchTerm ? { searchTerm: debouncedSearchTerm } : {};
      const response = await CourseCategoriesService.getCategoriesPaginated(pagination, searchParams);
      
      setCategories(response.data);
      setPaginationData(response);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Load categories from API (for refresh functionality)
  const loadCategories = async () => {
    await loadCategoriesPaginated();
  };

  // Load course counts for each category
  const loadCourseCounts = async () => {
    try {
      const counts: Record<number, number> = {};
      for (const category of categories) {
        const count = await CourseCategoriesService.getCourseCountForCategory(category.id);
        counts[category.id] = count;
      }
      setCourseCounts(counts);
    } catch (error) {
      console.error('Error loading course counts:', error);
      // Don't show error toast for course counts as it's not critical
    }
  };

  // Pagination functions
  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setPagination(prev => ({ ...prev, limit: newItemsPerPage, page: 1 }));
  };


  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on search
  };

  // Handle create category
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      setSubmitting(true);
      const newCategory = await CourseCategoriesService.createCategory({
        name: formData.name.trim()
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Category created successfully');
      // Refresh current page to show the new category
      await loadCategoriesPaginated();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit category
  const handleEdit = async () => {
    if (!editingCategory || !formData.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      setSubmitting(true);
      const updatedCategory = await CourseCategoriesService.updateCategory(editingCategory.id, {
        name: formData.name.trim()
      });
      
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      toast.success('Category updated successfully');
      // Refresh current page to show updated data
      await loadCategoriesPaginated();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete category
  const handleDelete = async (categoryId: number) => {
    try {
      setSubmitting(true);
      await CourseCategoriesService.deleteCategory(categoryId);
      toast.success('Category deleted successfully');
      // Refresh current page to show updated data
      await loadCategoriesPaginated();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (category: CourseCategory) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      setEditingCategory(category);
      setFormData({
        name: category.name
      });
      setIsEditDialogOpen(true);
    }, 100);
  };

  // Open view dialog
  const openViewDialog = (category: CourseCategory) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      setViewingCategory(category);
      setIsViewDialogOpen(true);
    }, 100);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: ''
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-3 lg:gap-4 overflow-hidden">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden max-w-[60%]">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                <BookCheck className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Course Categories
                </h1>
                <p className="text-xs md:text-sm lg:text-base xl:text-lg text-muted-foreground font-light mt-0.5 md:mt-1 break-words">
                  Manage course categories and organize your educational content
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <Badge variant="secondary" className="px-2 py-0.5 bg-primary/10 text-primary border-primary/20 text-[10px] md:text-xs whitespace-nowrap">
                <Sparkles className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Content Management</span>
                <span className="xl:hidden">Content</span>
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 text-[10px] md:text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Live Data</span>
                <span className="xl:hidden">Live</span>
              </Badge>
              {!isViewOnly && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white h-7 px-2 md:px-3 text-[10px] md:text-[11px] flex-shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="hidden xl:inline">Create Category</span>
                  <span className="xl:hidden">Create</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Layout */}
          <div className="flex flex-col gap-3 md:gap-4 lg:hidden">
            <div className="flex items-start gap-2 md:gap-3 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookCheck className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Course Categories
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground font-light mt-0.5 break-words">
                  Manage course categories and organize your educational content
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Badge variant="secondary" className="px-2 py-0.5 bg-primary/10 text-primary border-primary/20 text-xs whitespace-nowrap">
                <Sparkles className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Content Management</span>
                <span className="sm:hidden">Content</span>
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Live Data</span>
                <span className="sm:hidden">Live</span>
              </Badge>
              {!isViewOnly && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white h-9 px-3 md:px-4 text-xs md:text-sm flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <BookCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paginationData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All categories in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(courseCounts).reduce((sum, count) => sum + count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.length > 0 ? 
                categories.reduce((max, cat) => 
                  (courseCounts[cat.id] || 0) > (courseCounts[max.id] || 0) ? cat : max
                ).name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Category with most courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.filter(c => {
              const today = new Date();
              const createdDate = new Date(c.created_at);
              const diffTime = Math.abs(today.getTime() - createdDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7;
            }).length}</div>
            <p className="text-xs text-muted-foreground">Created this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadCategories} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Categories View Toggle and Content */}
      {loading ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading categories...
            </div>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              {searchTerm ? 'No categories found matching your search.' : 'No categories found.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 pb-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground break-words">Categories</h2>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">Switch between different views to manage your categories</p>
            </div>
            <div className="w-full sm:w-auto flex-shrink-0">
              <ViewToggle
                currentView={preferences.courseCategoriesView}
                onViewChange={setCourseCategoriesView}
                availableViews={['card', 'tile', 'list']}
                showLabels={true}
                className="w-full sm:w-auto"
              />
            </div>
          </div>

          {/* Conditional View Rendering */}
          {preferences.courseCategoriesView === 'card' && (
            <CategoryCardView
              categories={categories}
              courseCounts={courseCounts}
              onEdit={openEditDialog}
              onView={openViewDialog}
              onDelete={handleDelete}
              isDeleting={() => submitting}
              isViewOnly={isViewOnly}
            />
          )}

          {preferences.courseCategoriesView === 'tile' && (
            <CategoryTileView
              categories={categories}
              courseCounts={courseCounts}
              onEdit={openEditDialog}
              onView={openViewDialog}
              onDelete={handleDelete}
              isDeleting={() => submitting}
              isViewOnly={isViewOnly}
            />
          )}

          {preferences.courseCategoriesView === 'list' && (
            <CategoryListView
              categories={categories}
              courseCounts={courseCounts}
              onEdit={openEditDialog}
              onView={openViewDialog}
              onDelete={handleDelete}
              isDeleting={() => submitting}
              isViewOnly={isViewOnly}
            />
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {paginationData && (
        <PaginationControls
          currentPage={paginationData.page}
          totalPages={paginationData.totalPages}
          totalItems={paginationData.total}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={preferences.courseCategoriesView === 'tile' ? [9, 18, 27, 36, 45] : [4, 8, 12, 16, 20]}
          disabled={loading}
          className="mt-6"
        />
      )}

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new course category to organize your educational content.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Programming"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the information for {editingCategory?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name *</Label>
              <Input
                id="edit-category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Programming"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Category Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingCategory?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingCategory && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Category Name</Label>
                    <p className="text-lg font-semibold">{viewingCategory.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Courses Count</Label>
                    <p className="text-lg">{courseCounts[viewingCategory.id] || 0} courses</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{new Date(viewingCategory.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingCategory && !isViewOnly && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingCategory);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Category
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
