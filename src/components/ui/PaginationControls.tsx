import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  showPageInfo?: boolean;
  className?: string;
  disabled?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  showItemsPerPage = true,
  showPageInfo = true,
  className,
  disabled = false
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  const goToFirstPage = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const goToLastPage = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(totalPages);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !disabled) {
      onPageChange(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full overflow-x-auto", className)}>
      {/* Items per page selector and info */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto flex-shrink-0">
        {showItemsPerPage && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Show</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">per page</span>
          </div>
        )}

        {showPageInfo && (
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left whitespace-nowrap">
            Showing {startItem} to {endItem} of {totalItems} results
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {/* First page button - Hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          disabled={currentPage === 1 || disabled}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
        >
          <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage === 1 || disabled}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {getPageNumbers().map((page, index) => 
            page === '...' ? (
              <span key={index} className="px-1 sm:px-2 py-1 text-xs sm:text-sm text-muted-foreground">...</span>
            ) : (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page as number)}
                disabled={disabled}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage === totalPages || disabled}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>

        {/* Last page button - Hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          disabled={currentPage === totalPages || disabled}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
        >
          <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
};
