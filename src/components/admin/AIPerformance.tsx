import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Server,
  Cpu,
  Database,
  Gauge,
  BarChart3,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';

export const AIPerformance = () => {
  const [activeTab, setActiveTab] = useState('realtime');
  const [timeRange, setTimeRange] = useState('1h');

  // Mock performance data
  const realtimeMetrics = {
    responseTime: 1.24,
    throughput: 847,
    errorRate: 0.12,
    accuracy: 94.7,
    uptime: 99.8,
    activeConnections: 156
  };

  const performanceHistory = [
    { time: '00:00', responseTime: 1.1, throughput: 720, errorRate: 0.08, accuracy: 94.2 },
    { time: '04:00', responseTime: 0.9, throughput: 580, errorRate: 0.05, accuracy: 94.8 },
    { time: '08:00', responseTime: 1.3, throughput: 920, errorRate: 0.15, accuracy: 93.9 },
    { time: '12:00', responseTime: 1.5, throughput: 1240, errorRate: 0.18, accuracy: 93.5 },
    { time: '16:00', responseTime: 1.7, throughput: 1450, errorRate: 0.22, accuracy: 93.1 },
    { time: '20:00', responseTime: 1.4, throughput: 1180, errorRate: 0.16, accuracy: 94.0 }
  ];

  const modelPerformance = [
    { 
      name: 'Speech Recognition v2.1', 
      accuracy: 94.2, 
      latency: 1.1, 
      throughput: 450, 
      status: 'optimal',
      lastUpdate: '2 hours ago'
    },
    { 
      name: 'Text Analysis Engine v3.0', 
      accuracy: 91.8, 
      latency: 0.8, 
      throughput: 670, 
      status: 'good',
      lastUpdate: '1 hour ago'
    },
    { 
      name: 'Content Generator v1.9', 
      accuracy: 89.5, 
      latency: 2.1, 
      throughput: 280, 
      status: 'warning',
      lastUpdate: '30 min ago'
    },
    { 
      name: 'Assessment Engine v2.2', 
      accuracy: 87.3, 
      latency: 1.5, 
      throughput: 320, 
      status: 'needs-attention',
      lastUpdate: '5 min ago'
    }
  ];

  const systemHealth = [
    { component: 'API Gateway', status: 'healthy', load: 67, responseTime: 45 },
    { component: 'Load Balancer', status: 'healthy', load: 54, responseTime: 12 },
    { component: 'Database Cluster', status: 'warning', load: 82, responseTime: 156 },
    { component: 'Cache Layer', status: 'healthy', load: 43, responseTime: 8 },
    { component: 'AI Model Servers', status: 'healthy', load: 78, responseTime: 1200 },
    { component: 'File Storage', status: 'healthy', load: 34, responseTime: 67 }
  ];

  const alerts = [
    {
      id: 1,
      severity: 'warning',
      title: 'High Response Time',
      description: 'Content Generator latency above 2s threshold',
      timestamp: '2 minutes ago',
      component: 'Content Generator v1.9'
    },
    {
      id: 2,
      severity: 'info',
      title: 'Model Update Available',
      description: 'New version of Speech Recognition available',
      timestamp: '15 minutes ago',
      component: 'Speech Recognition v2.1'
    },
    {
      id: 3,
      severity: 'critical',
      title: 'Database Connection Pool',
      description: 'Connection pool utilization at 95%',
      timestamp: '1 hour ago',
      component: 'Database Cluster'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'needs-attention': return 'bg-red-500';
      case 'healthy': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal': case 'healthy': return 'default';
      case 'good': return 'secondary';
      case 'warning': return 'outline';
      case 'needs-attention': return 'destructive';
      default: return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Performance Monitoring</h1>
          <p className="text-muted-foreground mt-2">Monitor AI system performance and usage</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7d</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.responseTime}s</div>
            <p className="text-xs text-green-600">↓ 0.2s from avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.throughput}/min</div>
            <p className="text-xs text-blue-600">↑ 12% from avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.errorRate}%</div>
            <p className="text-xs text-red-600">↑ 0.05% from avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.accuracy}%</div>
            <p className="text-xs text-green-600">↑ 0.3% from avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.uptime}%</div>
            <p className="text-xs text-green-600">Excellent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics.activeConnections}</div>
            <p className="text-xs text-blue-600">Currently online</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Response Time Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}s`, 'Response Time']} />
                    <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Throughput Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}/min`, 'Throughput']} />
                    <Bar dataKey="throughput" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={2} name="Response Time (s)" />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Accuracy (%)" />
                  <Line yAxisId="left" type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} name="Error Rate (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Model Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {modelPerformance.map((model, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)}`} />
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Last updated: {model.lastUpdate}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusBadge(model.status)}>
                        {model.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
                        <div className="flex items-center gap-2">
                          <Progress value={model.accuracy} className="flex-1" />
                          <span className="text-sm font-medium">{model.accuracy}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Latency</div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-medium">{model.latency}s</div>
                          <span className="text-sm text-muted-foreground">avg response</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Throughput</div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-medium">{model.throughput}</div>
                          <span className="text-sm text-muted-foreground">req/min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Component Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth.map((component, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(component.status)}`} />
                      <div>
                        <div className="font-medium">{component.component}</div>
                        <div className="text-sm text-muted-foreground">
                          Load: {component.load}% • Response: {component.responseTime}ms
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getStatusColor(component.status)}`}
                            style={{ width: `${component.load}%` }}
                          ></div>
                        </div>
                      </div>
                      <Badge variant={getStatusBadge(component.status)}>
                        {component.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Load</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">59%</div>
                <p className="text-xs text-green-600">Optimal range</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Healthy Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5/6</div>
                <p className="text-xs text-yellow-600">1 needs attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">248ms</div>
                <p className="text-xs text-green-600">Within SLA</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${getSeverityColor(alert.severity)}`} />
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {alert.component} • {alert.timestamp}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={alert.severity === 'critical' ? 'destructive' : 
                                alert.severity === 'warning' ? 'outline' : 'secondary'}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Critical Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">1</div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Warning Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">1</div>
                <p className="text-xs text-muted-foreground">Monitor closely</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Info Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">1</div>
                <p className="text-xs text-muted-foreground">Informational only</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};