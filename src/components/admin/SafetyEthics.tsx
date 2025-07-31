import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Lock,
  User,
  FileText,
  Activity,
  TrendingUp,
  BarChart3,
  Filter,
  Download,
  Settings,
  Users,
  MessageCircle,
  Flag,
  Search,
  RefreshCw
} from 'lucide-react';

export const SafetyEthics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Mock safety data
  const safetyMetrics = {
    overallScore: 96.2,
    contentSafety: 98.5,
    biasDetection: 94.7,
    privacyCompliance: 97.8,
    ethicalGuidelines: 95.1,
    incidentsThisWeek: 3,
    flaggedContent: 12,
    reviewsPending: 2
  };

  const contentModeration = [
    {
      id: 'CM001',
      type: 'Inappropriate Language',
      content: 'User input contained mild profanity',
      severity: 'low',
      action: 'filtered',
      timestamp: '2024-01-20 14:30',
      userId: '***1234'
    },
    {
      id: 'CM002', 
      type: 'Potential Bias',
      content: 'AI response showed potential cultural bias',
      severity: 'medium',
      action: 'reviewed',
      timestamp: '2024-01-20 12:15',
      userId: '***5678'
    },
    {
      id: 'CM003',
      type: 'Privacy Concern',
      content: 'Request for personal information detected',
      severity: 'high',
      action: 'blocked',
      timestamp: '2024-01-20 09:45',
      userId: '***9012'
    },
    {
      id: 'CM004',
      type: 'Misinformation',
      content: 'Response contained questionable facts',
      severity: 'medium',
      action: 'flagged',
      timestamp: '2024-01-19 16:20',
      userId: '***3456'
    }
  ];

  const biasMetrics = [
    { category: 'Gender', score: 94.2, trend: 'stable', incidents: 2 },
    { category: 'Age', score: 96.8, trend: 'improving', incidents: 1 },
    { category: 'Ethnicity', score: 93.1, trend: 'improving', incidents: 3 },
    { category: 'Language', score: 97.5, trend: 'stable', incidents: 0 },
    { category: 'Socioeconomic', score: 95.3, trend: 'stable', incidents: 1 }
  ];

  const privacyCompliance = [
    { requirement: 'Data Minimization', status: 'compliant', score: 98 },
    { requirement: 'User Consent', status: 'compliant', score: 100 },
    { requirement: 'Data Retention', status: 'review-needed', score: 92 },
    { requirement: 'Right to Deletion', status: 'compliant', score: 96 },
    { requirement: 'Data Portability', status: 'compliant', score: 99 },
    { requirement: 'Transparency', status: 'compliant', score: 97 }
  ];

  const ethicalGuidelines = [
    {
      principle: 'Transparency',
      description: 'AI decisions are explainable and transparent',
      compliance: 96,
      lastReview: '2024-01-15'
    },
    {
      principle: 'Fairness',
      description: 'AI treats all users equitably',
      compliance: 94,
      lastReview: '2024-01-18'
    },
    {
      principle: 'Accountability',
      description: 'Clear responsibility for AI decisions',
      compliance: 97,
      lastReview: '2024-01-20'
    },
    {
      principle: 'Privacy',
      description: 'User data is protected and secure',
      compliance: 98,
      lastReview: '2024-01-19'
    },
    {
      principle: 'Beneficence',
      description: 'AI promotes human well-being',
      compliance: 95,
      lastReview: '2024-01-17'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-500';
      case 'review-needed': return 'bg-yellow-500';
      case 'non-compliant': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'blocked': return 'text-red-600';
      case 'flagged': return 'text-yellow-600';
      case 'filtered': return 'text-blue-600';
      case 'reviewed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Safety & Ethics</h1>
          <p className="text-muted-foreground mt-2">AI safety monitoring and ethical guidelines</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Safety Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{safetyMetrics.overallScore}%</div>
            <p className="text-xs text-green-600">↑ 0.8% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents This Week</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyMetrics.incidentsThisWeek}</div>
            <p className="text-xs text-yellow-600">↓ 2 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyMetrics.flaggedContent}</div>
            <p className="text-xs text-orange-600">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Compliance</CardTitle>
            <Lock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyMetrics.privacyCompliance}%</div>
            <p className="text-xs text-blue-600">Excellent rating</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
          <TabsTrigger value="bias">Bias Detection</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="ethics">Ethics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Safety Metrics Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Content Safety</span>
                    <span>{safetyMetrics.contentSafety}%</span>
                  </div>
                  <Progress value={safetyMetrics.contentSafety} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Bias Detection</span>
                    <span>{safetyMetrics.biasDetection}%</span>
                  </div>
                  <Progress value={safetyMetrics.biasDetection} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Privacy Compliance</span>
                    <span>{safetyMetrics.privacyCompliance}%</span>
                  </div>
                  <Progress value={safetyMetrics.privacyCompliance} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Ethical Guidelines</span>
                    <span>{safetyMetrics.ethicalGuidelines}%</span>
                  </div>
                  <Progress value={safetyMetrics.ethicalGuidelines} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <div className="font-medium">Safety Audit Completed</div>
                      <div className="text-sm text-muted-foreground">All systems passed safety checks</div>
                    </div>
                    <span className="text-xs text-muted-foreground">2h ago</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <div className="font-medium">Bias Alert</div>
                      <div className="text-sm text-muted-foreground">Potential bias detected in responses</div>
                    </div>
                    <span className="text-xs text-muted-foreground">4h ago</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium">Content Review</div>
                      <div className="text-sm text-muted-foreground">12 items flagged for manual review</div>
                    </div>
                    <span className="text-xs text-muted-foreground">6h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Content Moderation Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentModeration.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <div className="font-medium">{item.type}</div>
                        <Badge variant={getSeverityBadge(item.severity)}>
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {item.content}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">User: </span>
                        <span className="font-medium">{item.userId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Action:</span>
                        <span className={`font-medium ${getActionColor(item.action)}`}>
                          {item.action}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Auto-Filtered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">189</div>
                <p className="text-xs text-green-600">76% automated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Manual Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">58</div>
                <p className="text-xs text-yellow-600">24% required review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">False Positives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-blue-600">98.7% accuracy</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bias Detection Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {biasMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{metric.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {metric.incidents} incidents
                        </span>
                        <TrendingUp className={`h-4 w-4 ${
                          metric.trend === 'improving' ? 'text-green-600' : 
                          metric.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={metric.score} className="flex-1" />
                      <span className="text-sm font-medium">{metric.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overall Bias Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">95.4%</div>
                <p className="text-xs text-green-600">Excellent fairness</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24/7</div>
                <p className="text-xs text-muted-foreground">Continuous assessment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Improvement Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">↑ 2.3%</div>
                <p className="text-xs text-green-600">This month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {privacyCompliance.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                      <div>
                        <div className="font-medium">{item.requirement}</div>
                        <div className="text-sm text-muted-foreground">
                          Compliance Score: {item.score}%
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'compliant' ? 'default' : 'outline'}>
                      {item.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ethics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ethical Guidelines Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ethicalGuidelines.map((guideline, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{guideline.principle}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {guideline.description}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {guideline.compliance}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress value={guideline.compliance} />
                      <div className="text-xs text-muted-foreground">
                        Last reviewed: {guideline.lastReview}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content-filtering">Content Filtering</Label>
                  <Switch id="content-filtering" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="bias-detection">Bias Detection</Label>
                  <Switch id="bias-detection" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="privacy-protection">Privacy Protection</Label>
                  <Switch id="privacy-protection" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ethical-monitoring">Ethical Monitoring</Label>
                  <Switch id="ethical-monitoring" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="automated-responses">Automated Responses</Label>
                  <Switch id="automated-responses" defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Safety Score Threshold</Label>
                  <Select defaultValue="90">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="85">85%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="95">95%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bias Detection Sensitivity</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Privacy Alert Level</Label>
                  <Select defaultValue="strict">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relaxed">Relaxed</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="strict">Strict</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Safety Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-rules">Add Custom Safety Rule</Label>
                <Textarea 
                  id="custom-rules"
                  placeholder="Define custom safety rules and guidelines..."
                  className="min-h-[100px]"
                />
              </div>
              <Button>Add Rule</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};