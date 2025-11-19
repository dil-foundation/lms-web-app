import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookCheck, Edit, Trash2, Eye, MoreHorizontal, Calendar, Hash, Loader2 } from 'lucide-react';
import { CourseCategory } from '@/services/courseCategoriesService';

interface CategoryCardViewProps {
  categories: CourseCategory[];
  courseCounts: Record<number, number>;
  onEdit: (category: CourseCategory) => void;
  onView: (category: CourseCategory) => void;
  onDelete: (categoryId: number) => void;
  isDeleting?: (categoryId: number) => boolean;
  isViewOnly?: boolean;
  className?: string;
}

export const CategoryCardView: React.FC<CategoryCardViewProps> = ({
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
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 ${className}`}>
      {categories.map((category) => (
        <Card key={category.id} className="bg-card border border-border hover:border-primary/40 flex flex-col h-full shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="p-4 sm:p-5 md:p-6 pb-2 sm:pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                    {category.name}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    Course Category
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/80 flex-shrink-0">
                    <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onView(category)} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {!isViewOnly && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit(category)} className="cursor-pointer">
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
          </CardHeader>

          <CardContent className="p-4 sm:p-5 md:p-6 pt-0 flex flex-col flex-1">
            <div className="flex flex-col flex-1 space-y-3 sm:space-y-4">
              {/* Stats Grid - Responsive */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/30">
                <div className="flex flex-col items-center justify-center text-center space-y-1">
                  <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                      {courseCounts[category.id] || 0}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      Courses
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-1 border-x border-border/30">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground">
                      {new Date(category.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      Created
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-1">
                  <BookCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                      #
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      ID: {category.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Count Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 font-semibold">
                  {courseCounts[category.id] || 0} {courseCounts[category.id] === 1 ? 'course' : 'courses'}
                </Badge>
              </div>
            </div>

            {/* Action Buttons - Fixed at Bottom */}
            <div className="mt-auto pt-3 sm:pt-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(category)}
                  className={`h-9 sm:h-10 md:h-11 text-xs sm:text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-200 ${isViewOnly ? 'w-full' : 'flex-1'}`}
                >
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                  View Details
                </Button>
                {!isViewOnly && (
                  <Button
                    size="sm"
                    className="flex-1 h-9 sm:h-10 md:h-11 text-xs sm:text-sm font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white transition-all duration-200"
                    onClick={() => onEdit(category)}
                  >
                    <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                    Edit
                  </Button>
                )}
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
