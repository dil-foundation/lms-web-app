import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Clock, XCircle, Undo2, Eye, RotateCcw, CreditCard, Calendar } from 'lucide-react';

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

interface OrderTileViewProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onRefund: (order: Order) => void;
}

export const OrderTileView: React.FC<OrderTileViewProps> = ({
  orders,
  onViewDetails,
  onRefund
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="warning" className="bg-yellow-600 hover:bg-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-purple-600 text-purple-600 text-xs"><Undo2 className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
          onClick={() => onViewDetails(order)}
        >
          <div className="p-2 sm:p-3 flex flex-col flex-1 h-full">
            {/* User Info */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border border-primary/20 flex-shrink-0">
                <AvatarImage src={order.user.avatar_url || undefined} alt={order.user.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[9px] sm:text-[10px]">
                  {getInitials(order.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[10px] sm:text-xs leading-tight truncate group-hover:text-primary transition-colors">
                  {order.user.full_name}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                  {order.user.email}
                </p>
              </div>
            </div>

            {/* Course Info */}
            <div className="mb-2 flex-1">
              <p className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-2 min-h-[2em]">
                {order.course.title}
              </p>
            </div>

            {/* Amount and Status */}
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs sm:text-sm text-primary">
                  {formatCurrency(order.amount)}
                </span>
              </div>
              <div className="flex items-center justify-center">
                {getStatusBadge(order.status)}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground mb-2 p-1.5 bg-muted/30 dark:bg-muted/20 rounded-md">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              <span className="truncate font-medium">{formatDate(order.payment_date)}</span>
            </div>

            {/* Actions - Fixed at Bottom */}
            <div className="mt-auto flex gap-1 pt-2 flex-shrink-0">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
                size="sm"
                className="flex-1 h-6 sm:h-7 text-[9px] sm:text-xs font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
              >
                <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                View
              </Button>
              {order.status === 'completed' && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefund(order);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-6 sm:h-7 w-6 sm:w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

