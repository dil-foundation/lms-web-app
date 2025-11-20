import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookCheck, Edit, Trash2, Eye, MoreHorizontal, Calendar, Hash, Loader2 } from 'lucide-react';
import { CourseCategory } from '@/services/courseCategoriesService';

interface CategoryListViewProps {
  categories: CourseCategory[];
  courseCounts: Record<number, number>;
  onEdit: (category: CourseCategory) => void;
  onView: (category: CourseCategory) => void;
  onDelete: (categoryId: number) => void;
  isDeleting?: (categoryId: number) => boolean;
  isViewOnly?: boolean;
  className?: string;
}

export const CategoryListView: React.FC<CategoryListViewProps> = ({
  categories,
  courseCounts,
  onEdit,
  onView,
  onDelete,
  isDeleting = () => false,
  isViewOnly = false,
  className
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CourseCategory | null>(null);

  const handleView = (category: CourseCategory) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => onView(category), 100);
  };

  const handleEdit = (category: CourseCategory) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => onEdit(category), 100);
  };

  const handleDeleteClick = (category: CourseCategory) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      setCategoryToDelete(category);
      setDeleteDialogOpen(true);
    }, 100);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      onDelete(categoryToDelete.id);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className={`space-y-2 sm:space-y-3 ${className}`}>
      {categories.map((category) => (
        <Card 
          key={category.id}
          className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 border-l-4 border-l-transparent hover:border-l-primary"
          onClick={() => onView(category)}
        >
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/10 via-primary/15 to-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <BookCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                {/* Title and ID */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                  <h3 className="font-bold text-sm sm:text-base md:text-lg group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    #{category.id}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  Course Category
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-2.5 bg-muted/30 dark:bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-primary/10">
                      <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {courseCounts[category.id] || 0}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                        Courses
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-primary/10">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {new Date(category.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                        Created
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 hidden sm:flex">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-primary/10">
                      <BookCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {courseCounts[category.id] || 0}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                        Total
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(category);
                  }}
                >
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                  View
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-muted/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleView(category)} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {!isViewOnly && (
                      <>
                        <DropdownMenuItem onClick={() => handleEdit(category)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(category)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Category
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
              {categoryToDelete && (courseCounts[categoryToDelete.id] || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  Warning: This category has {courseCounts[categoryToDelete.id]} courses assigned to it.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={categoryToDelete ? isDeleting(categoryToDelete.id) : false}
            >
              {categoryToDelete && isDeleting(categoryToDelete.id) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
