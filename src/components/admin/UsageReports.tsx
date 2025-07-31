import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/calendar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Users,
  Zap,
  Database,
  Clock,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Server
} from 'lucide-react';

export const UsageReports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  // Mock usage data
  const costData = [
    { date: '2024-01-01', api: 245.50, storage: 89.20, compute: 156.30, total: 491.00 },
    { date: '2024-01-08', api: 267.80, storage: 92.10, compute: 178.40, total: 538.30 },
    { date: '2024-01-15', api: 289.20, storage: 95.60, compute: 195.80, total: 580.60 },
    { date: '2024-01-22', api: 312.40, storage: 98.90, compute: 213.70, total: 625.00 },
    { date: '2024-01-29', api: 334.80, storage: 102.30, compute: 231.90, total: 669.00 }
  ];

  const usageMetrics = [
    { service: 'Speech Recognition API', requests: 145780, cost: 234.50, trend: 'up' },
    { service: 'Text Analysis Engine', requests: 89540, cost: 178.20, trend: 'up' },
    { service: 'Content Generation', requests: 67890, cost: 345.80, trend: 'down' },
    { service: 'Assessment Engine', requests: 45120, cost: 123.40, trend: 'up' },
    { service: 'Translation Service', requests: 23450, cost: 89.60, trend: 'stable' }
  ];

  const resourceUsage = [
    { resource: 'CPU Hours', used: 2847, allocated: 3500, cost: 142.35 },
    { resource: 'Memory (GB-hours)', used: 5623, allocated: 7000, cost: 281.15 },
    { resource: 'Storage (GB)', used: 1250, allocated: 2000, cost: 62.50 },
    { resource: 'Network (TB)', used: 12.8, allocated: 20, cost: 128.00 },
    { resource: 'GPU Hours', used: 567, allocated: 800, cost: 1134.00 }
  ];

  const departments = [
    { name: 'Student Learning', usage: 45, cost: 289.50, users: 1523 },
    { name: 'Teacher Tools', usage: 28, cost: 178.20, users: 108 },
    { name: 'Admin Operations', usage: 15, cost: 95.40, users: 14 },
    { name: 'Content Management', usage: 12, cost: 76.90, users: 45 }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Reports</h1>
          <p className="text-muted-foreground mt-2">Detailed AI usage and cost reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Custom Range
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,847.50</div>
            <p className="text-xs text-green-600">↑ $247.30 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">371.8K</div>
            <p className="text-xs text-blue-600">↑ 12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,690</div>
            <p className="text-xs text-purple-600">↑ 8.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per User</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1.68</div>
            <p className="text-xs text-orange-600">↓ $0.12 from last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Cost Overview</TabsTrigger>
          <TabsTrigger value="services">Service Usage</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cost Breakdown Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="api" stroke="#3b82f6" strokeWidth={2} name="API Costs" />
                  <Line type="monotone" dataKey="storage" stroke="#10b981" strokeWidth={2} name="Storage" />
                  <Line type="monotone" dataKey="compute" stroke="#f59e0b" strokeWidth={2} name="Compute" />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>API Requests</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-[50%]"></div>
                    </div>
                    <span className="text-sm font-medium">50%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Compute Resources</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full w-[35%]"></div>
                    </div>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-[15%]"></div>
                    </div>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Budget</span>
                    <span>$3,500.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Spend</span>
                    <span>$2,847.50</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full w-[81%]"></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Remaining: $652.50</span>
                    <span className="text-muted-foreground">18.6% left</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">On track for monthly target</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageMetrics.map((service, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{service.service}</div>
                        {getTrendIcon(service.trend)}
                      </div>
                      <Badge variant="outline">${service.cost}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>Requests: {service.requests.toLocaleString()}</div>
                      <div className={getTrendColor(service.trend)}>
                        Trend: {service.trend === 'up' ? 'Increasing' : service.trend === 'down' ? 'Decreasing' : 'Stable'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Resource Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {resourceUsage.map((resource, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{resource.resource}</span>
                      <span className="text-sm text-muted-foreground">${resource.cost}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>{resource.used.toLocaleString()} used</span>
                      <span>{resource.allocated.toLocaleString()} allocated</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(resource.used / resource.allocated) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((resource.used / resource.allocated) * 100)}% utilized
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dept.users} users • {dept.usage}% of total usage
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${dept.cost}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(dept.cost / dept.users).toFixed(2)}/user
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">Enable API Caching</div>
                    <div className="text-sm text-green-700">
                      Could reduce API costs by 25-30% (~$85/month)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Optimize Batch Processing</div>
                    <div className="text-sm text-blue-700">
                      Bundle requests to reduce compute costs by 15%
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-50">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">Review Storage Usage</div>
                    <div className="text-sm text-yellow-700">
                      Archive old data to reduce storage costs
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forecasted Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Next Month (Projected)</span>
                    <span className="font-medium">$3,124.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>With Optimizations</span>
                    <span className="font-medium text-green-600">$2,687.20</span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600">
                    <span>Potential Savings</span>
                    <span>$437.30</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Annual Projection</div>
                  <div className="flex justify-between">
                    <span>Current Trend</span>
                    <span className="font-medium">$37,494</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>With Optimizations</span>
                    <span className="font-medium">$32,246</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium">Off-Peak Processing</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Schedule heavy tasks during low-cost hours
                  </div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium">Usage Monitoring</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Set up alerts for unusual usage patterns
                  </div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="font-medium">Regular Reviews</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Monthly cost and usage analysis
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};