import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BookCheck, Edit, Trash2, Eye, MoreHorizontal, Calendar, Hash, Loader2 } from 'lucide-react';
import { CourseCategory } from '@/services/courseCategoriesService';

interface CategoryTileViewProps {
  categories: CourseCategory[];
  courseCounts: Record<number, number>;
  onEdit: (category: CourseCategory) => void;
  onView: (category: CourseCategory) => void;
  onDelete: (categoryId: number) => void;
  isDeleting?: (categoryId: number) => boolean;
  className?: string;
}

export const CategoryTileView: React.FC<CategoryTileViewProps> = ({
  categories,
  courseCounts,
  onEdit,
  onView,
  onDelete,
  isDeleting = () => false,
  className
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${className}`}>
      {categories.map((category) => (
        <Card 
          key={category.id} 
          className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-60 flex flex-col overflow-hidden"
        >
          <CardContent className="p-3 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center shadow-lg">
                <BookCheck className="w-4 h-4 text-primary" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(category)}>
                    <Eye className="mr-2 h-3 w-3" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(category)}>
                    <Edit className="mr-2 h-3 w-3" />
                    Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-3 w-3" />
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex-1 flex flex-col space-y-1">
              <div>
                <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors duration-300 mb-1">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Course Category
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs font-medium">
                  {courseCounts[category.id] || 0} courses
                </Badge>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-muted-foreground">
                  {new Date(category.created_at).toLocaleDateString()}
                </div>
                <div className="text-xs font-medium text-primary">
                  {courseCounts[category.id] || 0}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(category)}
                className="w-full h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
