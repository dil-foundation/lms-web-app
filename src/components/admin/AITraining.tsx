import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Brain, 
  Play, 
  Pause, 
  Square,
  Upload,
  Download,
  Database,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  FileText,
  Target
} from 'lucide-react';

export const AITraining = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock training data
  const trainingJobs = [
    {
      id: 'job_001',
      name: 'Speech Recognition Enhancement',
      model: 'Speech-to-Text v2.2',
      status: 'running',
      progress: 65,
      startTime: '2024-01-20 10:30 AM',
      estimatedCompletion: '2024-01-20 4:30 PM',
      dataset: 'English Conversations v3',
      accuracy: 94.2,
      loss: 0.125
    },
    {
      id: 'job_002',
      name: 'Content Generation Fine-tuning',
      model: 'Content Generator v1.8',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-19 2:00 PM',
      estimatedCompletion: '2024-01-19 8:00 PM',
      dataset: 'Educational Content v2',
      accuracy: 91.7,
      loss: 0.089
    },
    {
      id: 'job_003',
      name: 'Assessment Engine Training',
      model: 'Assessment AI v2.3',
      status: 'queued',
      progress: 0,
      startTime: 'Pending',
      estimatedCompletion: 'TBD',
      dataset: 'Assessment Data v4',
      accuracy: 0,
      loss: 0
    },
    {
      id: 'job_004',
      name: 'Multilingual Support Training',
      model: 'Translation Engine v1.5',
      status: 'failed',
      progress: 23,
      startTime: '2024-01-18 6:00 PM',
      estimatedCompletion: 'Failed',
      dataset: 'Multilingual Corpus v1',
      accuracy: 0,
      loss: 0.456
    }
  ];

  const datasets = [
    {
      name: 'English Conversations v3',
      size: '2.4 GB',
      samples: '450K',
      type: 'Speech',
      lastUpdated: '2024-01-15',
      quality: 95
    },
    {
      name: 'Educational Content v2',
      size: '1.8 GB',
      samples: '125K',
      type: 'Text',
      lastUpdated: '2024-01-12',
      quality: 92
    },
    {
      name: 'Assessment Data v4',
      size: '890 MB',
      samples: '89K',
      type: 'Structured',
      lastUpdated: '2024-01-18',
      quality: 97
    },
    {
      name: 'Multilingual Corpus v1',
      size: '3.2 GB',
      samples: '620K',
      type: 'Mixed',
      lastUpdated: '2024-01-10',
      quality: 87
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'queued': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return 'secondary';
      case 'completed': return 'default';
      case 'queued': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Training Center</h1>
          <p className="text-muted-foreground mt-2">Train and fine-tune AI models</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            New Training Job
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 running, 1 queued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-green-600">↑ 3 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Training Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
            <p className="text-xs text-orange-600">↓ 0.8h from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-purple-600">↑ 2.3% this month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Training Jobs</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="create">Create Job</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Training Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingJobs.map((job) => (
                  <div key={job.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(job.status)}`} />
                        <div>
                          <div className="font-medium">{job.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Model: {job.model} • Dataset: {job.dataset}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadge(job.status)}>
                          {job.status}
                        </Badge>
                        {job.status === 'running' && (
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'queued' && (
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {job.status === 'running' && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Started</div>
                        <div className="font-medium">{job.startTime}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">ETA</div>
                        <div className="font-medium">{job.estimatedCompletion}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Accuracy</div>
                        <div className="font-medium">
                          {job.accuracy > 0 ? `${job.accuracy}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Loss</div>
                        <div className="font-medium">
                          {job.loss > 0 ? job.loss.toFixed(3) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Training Datasets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasets.map((dataset, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{dataset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {dataset.type} • {dataset.samples} samples
                        </div>
                      </div>
                      <Badge variant="outline">{dataset.size}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quality Score</span>
                        <span>{dataset.quality}%</span>
                      </div>
                      <Progress value={dataset.quality} />
                      <div className="text-sm text-muted-foreground">
                        Last updated: {dataset.lastUpdated}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">Job Name</Label>
                  <Input id="job-name" placeholder="Enter training job name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-select">Select Model</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose model to train" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speech-recognition">Speech Recognition v2.2</SelectItem>
                      <SelectItem value="text-analysis">Text Analysis Engine v3.0</SelectItem>
                      <SelectItem value="content-gen">Content Generator v1.8</SelectItem>
                      <SelectItem value="assessment">Assessment Engine v2.3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-select">Training Dataset</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose training dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversations">English Conversations v3</SelectItem>
                      <SelectItem value="content">Educational Content v2</SelectItem>
                      <SelectItem value="assessments">Assessment Data v4</SelectItem>
                      <SelectItem value="multilingual">Multilingual Corpus v1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe the training objectives..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="learning-rate">Learning Rate</Label>
                    <Input id="learning-rate" type="number" defaultValue="0.001" step="0.0001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input id="batch-size" type="number" defaultValue="32" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="epochs">Epochs</Label>
                    <Input id="epochs" type="number" defaultValue="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validation-split">Validation Split</Label>
                    <Input id="validation-split" type="number" defaultValue="0.2" step="0.1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimizer">Optimizer</Label>
                  <Select defaultValue="adam">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adam">Adam</SelectItem>
                      <SelectItem value="sgd">SGD</SelectItem>
                      <SelectItem value="rmsprop">RMSprop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4">
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Training Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">GPU Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <Progress value={87} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">4/4 GPUs active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Training Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">jobs waiting</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Estimated Wait Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.5h</div>
                <p className="text-xs text-muted-foreground">for next job</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>76%</span>
                  </div>
                  <Progress value={76} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>89%</span>
                  </div>
                  <Progress value={89} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage Usage</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Network I/O</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div className="flex-1">
                      <div className="font-medium">High GPU Temperature</div>
                      <div className="text-sm text-muted-foreground">GPU 3 running at 82°C</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <div className="font-medium">Training Completed</div>
                      <div className="text-sm text-muted-foreground">Content Generator v1.8 finished</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};