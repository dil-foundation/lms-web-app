import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  return (
    <div className={`grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {categories.map((category) => (
        <Card key={category.id} className="bg-card border border-border flex flex-col h-full">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors duration-300">
                    {category.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Course Category
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(category)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {!isViewOnly && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Category
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Category
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{category.name}"? This action cannot be undone.
                          {(courseCounts[category.id] || 0) > 0 && (
                            <span className="block mt-2 text-amber-600">
                              Warning: This category has {courseCounts[category.id]} courses assigned to it.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(category.id)}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isDeleting(category.id)}
                        >
                          {isDeleting(category.id) ? (
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3 flex-grow">
            {/* Detailed Category Stats - Horizontal Layout */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1 w-1/3">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-foreground">{courseCounts[category.id] || 0}</span>
                </div>
                <div className="flex items-center gap-1 w-1/3 justify-center">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-foreground">Created</span>
                </div>
                <div className="flex items-center gap-1 w-1/3 justify-end">
                  <BookCheck className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {new Date(category.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Course Count Badge */}
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {courseCounts[category.id] || 0} courses
              </Badge>
            </div>
          </CardContent>

          <div className="p-4 pt-0 mt-auto">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(category)}
                className={`h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200 ${isViewOnly ? 'w-full' : 'flex-1'}`}
              >
                <Eye className="w-3 h-3 mr-1" />
                View Details
              </Button>
              {!isViewOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(category)}
                  className="flex-1 h-8 text-xs hover:bg-blue-600 hover:text-white transition-all duration-200"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
