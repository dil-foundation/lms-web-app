import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle2, Clock, XCircle, Undo2, Eye, RotateCcw, MoreVertical, CreditCard, Calendar, User } from 'lucide-react';

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

interface OrderCardViewProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onRefund: (order: Order) => void;
}

export const OrderCardView: React.FC<OrderCardViewProps> = ({
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm line-clamp-2 mb-1">{order.course.title}</p>
              {order.course.subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1">{order.course.subtitle}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(order.amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(order.status)}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(order.payment_date)}</span>
              </div>

              {order.payment_method && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  <span className="capitalize">{order.payment_method}</span>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-3 border-t">
            <Button
              onClick={() => onViewDetails(order)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

