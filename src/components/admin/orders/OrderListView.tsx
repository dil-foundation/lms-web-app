import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle2, Clock, XCircle, Undo2, Eye, RotateCcw, MoreVertical } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payment_date: string;
  metadata?: any;
  user: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  course: {
    title: string;
    subtitle: string | null;
  };
  [key: string]: any; // Allow additional properties
}

interface OrderListViewProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onRefund: (order: Order) => void;
}

export const OrderListView: React.FC<OrderListViewProps> = ({
  orders,
  onViewDetails,
  onRefund
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="warning" className="bg-yellow-600 hover:bg-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-purple-600 text-purple-600"><Undo2 className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[250px]">Customer</TableHead>
            <TableHead className="w-[300px]">Course</TableHead>
            <TableHead className="w-[120px]">Amount</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[180px]">Payment Date</TableHead>
            <TableHead className="w-[130px]">Method</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-primary/20">
                    <AvatarImage src={order.user.avatar_url || undefined} alt={order.user.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {getInitials(order.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{order.user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm line-clamp-1">{order.course.title}</p>
                  {order.course.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{order.course.subtitle}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-bold text-primary">{formatCurrency(order.amount)}</span>
              </TableCell>
              <TableCell>
                {getStatusBadge(order.status)}
              </TableCell>
              <TableCell>
                <span className="text-sm">{formatDate(order.payment_date)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{order.payment_method || 'N/A'}</span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(order)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {order.status === 'completed' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onRefund(order)}
                          className="text-destructive focus:text-destructive"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Process Refund
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

