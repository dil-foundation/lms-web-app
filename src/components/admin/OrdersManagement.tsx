import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  RefreshCw, 
  MoreHorizontal, 
  Eye, 
  Undo2, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { cn } from '@/lib/utils';
import { OrderCardView } from './orders/OrderCardView';
import { OrderTileView } from './orders/OrderTileView';
import { OrderListView } from './orders/OrderListView';

interface Order {
  id: string;
  user_id: string;
  course_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
  course?: {
    title: string;
    subtitle: string | null;
  };
}

const OrdersManagement: React.FC = () => {
  const { user } = useAuth();
  const { preferences, setOrdersView } = useViewPreferences();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    refundedOrders: 0
  });

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('course_payments')
        .select(`
          *,
          user:profiles(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          course:courses(
            title,
            subtitle
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      setOrders(data || []);
      setTotalOrders(count || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Total orders
      const { count: totalCount } = await supabase
        .from('course_payments')
        .select('*', { count: 'exact', head: true });

      // Completed orders
      const { count: completedCount } = await supabase
        .from('course_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Refunded orders
      const { count: refundedCount } = await supabase
        .from('course_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'refunded');

      // Total revenue (completed orders only)
      const { data: revenueData } = await supabase
        .from('course_payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.amount, 0) || 0;

      setStats({
        totalOrders: totalCount || 0,
        totalRevenue: totalRevenue,
        completedOrders: completedCount || 0,
        refundedOrders: refundedCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
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

  // Handle view order
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  // Handle refund
  const handleRefundClick = (order: Order) => {
    setSelectedOrder(order);
    setIsRefundDialogOpen(true);
  };

  const handleRefundConfirm = async () => {
    if (!selectedOrder) return;

    setIsRefunding(true);
    try {
      // Call edge function using Supabase client
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          paymentId: selectedOrder.id,
          reason: refundReason,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process refund');
      }

      toast.success('Refund processed successfully. The customer will receive the refund in 5-10 business days.');
      setIsRefundDialogOpen(false);
      setRefundReason('');
      setSelectedOrder(null);
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setIsRefunding(false);
    }
  };

  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  // Transform orders for view components
  const transformedOrders = orders.map(order => ({
    ...order,
    user: {
      full_name: order.customer_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || 'Unknown',
      email: order.customer_email || order.user?.email || '',
      avatar_url: order.user?.avatar_url || null
    },
    course: {
      title: order.course?.title || 'N/A',
      subtitle: order.course?.subtitle || null
    },
    payment_date: order.completed_at || order.created_at,
    metadata: null
  })) as any[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Orders Management
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Manage course payments and process refunds
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                <DollarSign className="h-3 w-3 mr-1" />
                Payment Management
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All payment transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From completed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunded Orders</CardTitle>
            <Undo2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.refundedOrders}</div>
            <p className="text-xs text-muted-foreground">Refund transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Order Directory</CardTitle>
          <CardDescription>Search and filter payment orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by customer name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40 bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">All Status</SelectItem>
                <SelectItem value="completed" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Completed</SelectItem>
                <SelectItem value="pending" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Pending</SelectItem>
                <SelectItem value="failed" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Failed</SelectItem>
                <SelectItem value="refunded" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => { fetchOrders(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-6">
              {/* View Toggle */}
              <div className="flex items-center justify-between px-6 pt-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Orders</h2>
                  <p className="text-sm text-muted-foreground">Switch between different views to manage orders</p>
                </div>
                <ViewToggle
                  currentView={preferences.ordersView}
                  onViewChange={setOrdersView}
                  availableViews={['card', 'tile', 'list']}
                />
              </div>

              {/* Order Display based on selected view */}
              <div className="px-6 pb-6">
                {preferences.ordersView === 'card' && (
                  <OrderCardView
                    orders={transformedOrders}
                    onViewDetails={(order: any) => handleViewOrder(order)}
                    onRefund={(order: any) => handleRefundClick(order)}
                  />
                )}

                {preferences.ordersView === 'tile' && (
                  <OrderTileView
                    orders={transformedOrders}
                    onViewDetails={(order: any) => handleViewOrder(order)}
                    onRefund={(order: any) => handleRefundClick(order)}
                  />
                )}

                {preferences.ordersView === 'list' && (
                  <OrderListView
                    orders={transformedOrders}
                    onViewDetails={(order: any) => handleViewOrder(order)}
                    onRefund={(order: any) => handleRefundClick(order)}
                  />
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="py-4 border-t px-6">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalOrders}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newValue) => {
                      setItemsPerPage(newValue);
                      setCurrentPage(1);
                    }}
                    itemsPerPageOptions={[5, 10, 20, 50, 100]}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No orders found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                {searchTerm || statusFilter !== 'all'
                  ? 'No orders match your current search and filter criteria. Try adjusting your filters.'
                  : 'No payment orders have been recorded yet.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete information about this payment transaction
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedOrder.user?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedOrder.customer_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{selectedOrder.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Course</Label>
                    <p className="font-semibold mt-1">{selectedOrder.course?.title}</p>
                    {selectedOrder.course?.subtitle && (
                      <p className="text-sm text-muted-foreground">{selectedOrder.course.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {formatCurrency(selectedOrder.amount, selectedOrder.currency)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                    <Badge variant="outline" className="mt-1">{selectedOrder.payment_method || 'card'}</Badge>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Transaction Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="min-w-0">
                    <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono text-xs mt-1 break-all">{selectedOrder.id}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs text-muted-foreground">Stripe Session ID</Label>
                    <p className="font-mono text-xs mt-1 break-all">{selectedOrder.stripe_session_id}</p>
                  </div>
                  {selectedOrder.stripe_payment_intent_id && (
                    <div className="min-w-0">
                      <Label className="text-xs text-muted-foreground">Payment Intent ID</Label>
                      <p className="font-mono text-xs mt-1 break-all">{selectedOrder.stripe_payment_intent_id}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Created At</Label>
                    <p className="mt-1">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  {selectedOrder.completed_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Completed At</Label>
                      <p className="mt-1">{formatDate(selectedOrder.completed_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedOrder?.status === 'completed' && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleRefundClick(selectedOrder);
                }}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <AlertDialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to refund this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedOrder && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Undo2 className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">Refund Details</h4>
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      Customer: <strong>{selectedOrder.customer_name}</strong>
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      Amount: <strong>{formatCurrency(selectedOrder.amount, selectedOrder.currency)}</strong>
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      Course: <strong>{selectedOrder.course?.title}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-reason">Refund Reason (Optional)</Label>
                <Input
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsRefundDialogOpen(false);
              setRefundReason('');
              setSelectedOrder(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefundConfirm}
              disabled={isRefunding}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRefunding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Process Refund
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersManagement;

