import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BookCheck, Edit, Trash2, Eye, MoreHorizontal, Calendar, Hash, Loader2 } from 'lucide-react';
import { CourseCategory } from '@/services/courseCategoriesService';

interface CategoryListViewProps {
  categories: CourseCategory[];
  courseCounts: Record<number, number>;
  onEdit: (category: CourseCategory) => void;
  onView: (category: CourseCategory) => void;
  onDelete: (categoryId: number) => void;
  isDeleting?: (categoryId: number) => boolean;
  className?: string;
}

export const CategoryListView: React.FC<CategoryListViewProps> = ({
  categories,
  courseCounts,
  onEdit,
  onView,
  onDelete,
  isDeleting = () => false,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <BookCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-muted-foreground">Course Category</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {courseCounts[category.id] || 0} courses
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(category.created_at).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
