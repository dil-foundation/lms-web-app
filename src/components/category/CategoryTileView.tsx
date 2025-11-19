import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookCheck, Edit, Trash2, Eye, MoreHorizontal, Calendar, Hash, Loader2 } from 'lucide-react';
import { CourseCategory } from '@/services/courseCategoriesService';

interface CategoryTileViewProps {
  categories: CourseCategory[];
  courseCounts: Record<number, number>;
  onEdit: (category: CourseCategory) => void;
  onView: (category: CourseCategory) => void;
  onDelete: (categoryId: number) => void;
  isDeleting?: (categoryId: number) => boolean;
  isViewOnly?: boolean;
  className?: string;
}

export const CategoryTileView: React.FC<CategoryTileViewProps> = ({
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
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 ${className}`}>
      {categories.map((category) => (
        <Card 
          key={category.id} 
          className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
          onClick={() => onView(category)}
        >
          <CardContent className="p-2 sm:p-3 flex flex-col flex-1 h-full">
            <div className="flex items-start justify-between mb-2 gap-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-md sm:rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                <BookCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-muted/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleView(category)} className="cursor-pointer">
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    View
                  </DropdownMenuItem>
                  {!isViewOnly && (
                    <>
                      <DropdownMenuItem onClick={() => handleEdit(category)} className="cursor-pointer">
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteClick(category)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex-1 flex flex-col space-y-2">
              <div>
                <h3 className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300 mb-1 min-h-[2em]">
                  {category.name}
                </h3>
                <p className="text-[9px] sm:text-xs text-muted-foreground line-clamp-1">
                  Course Category
                </p>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-muted-foreground py-1.5 px-1 bg-muted/30 dark:bg-muted/20 rounded-md">
                <div className="flex flex-col items-center justify-center text-center">
                  <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mb-0.5 text-primary/70" />
                  <span className="font-bold text-foreground">{courseCounts[category.id] || 0}</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center border-l border-border/30">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mb-0.5 text-primary/70" />
                  <span className="font-bold text-foreground text-[8px] sm:text-[9px]">
                    {new Date(category.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex-shrink-0 pt-2">
              <Button
                size="sm"
                className="w-full h-6 sm:h-7 text-[9px] sm:text-xs font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(category);
                }}
              >
                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                View
              </Button>
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
