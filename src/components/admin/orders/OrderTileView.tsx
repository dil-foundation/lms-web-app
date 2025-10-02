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
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="p-3 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
          onClick={() => onViewDetails(order)}
        >
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={order.user.avatar_url || undefined} alt={order.user.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {getInitials(order.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{order.user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{order.user.email}</p>
              </div>
            </div>

            {/* Course Info */}
            <div>
              <p className="font-medium text-xs line-clamp-2 mb-1">{order.course.title}</p>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">{formatCurrency(order.amount)}</span>
              {getStatusBadge(order.status)}
            </div>

            {/* Date */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(order.payment_date)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-1 pt-2 border-t">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
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
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

