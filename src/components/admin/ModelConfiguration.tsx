import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Brain, 
  Zap, 
  Target, 
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Cog,
  Database,
  Activity,
  TrendingUp,
  FileText
} from 'lucide-react';

export const ModelConfiguration = () => {
  const [activeTab, setActiveTab] = useState('models');
  const [selectedModel, setSelectedModel] = useState('speech-recognition-v2');

  // Mock model data
  const models = [
    {
      id: 'speech-recognition-v2',
      name: 'Speech Recognition v2.1',
      type: 'Speech-to-Text',
      status: 'active',
      accuracy: 94.2,
      latency: 1.2,
      version: '2.1.4',
      lastTrained: '2024-01-15',
      parameters: '175M',
      size: '2.4GB'
    },
    {
      id: 'text-analysis-v3',
      name: 'Text Analysis Engine v3.0',
      type: 'NLP',
      status: 'active',
      accuracy: 89.7,
      latency: 0.8,
      version: '3.0.1',
      lastTrained: '2024-01-20',
      parameters: '340M',
      size: '4.1GB'
    },
    {
      id: 'recommendation-v1',
      name: 'Learning Recommendation v1.9',
      type: 'Recommendation',
      status: 'training',
      accuracy: 91.5,
      latency: 2.1,
      version: '1.9.3',
      lastTrained: '2024-01-10',
      parameters: '89M',
      size: '1.2GB'
    },
    {
      id: 'assessment-v2',
      name: 'Assessment Engine v2.2',
      type: 'Assessment',
      status: 'inactive',
      accuracy: 87.3,
      latency: 1.5,
      version: '2.2.1',
      lastTrained: '2024-01-05',
      parameters: '120M',
      size: '1.8GB'
    }
  ];

  const selectedModelData = models.find(m => m.id === selectedModel);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'training': return 'bg-blue-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'training': return 'secondary';
      case 'inactive': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Configuration</h1>
          <p className="text-muted-foreground mt-2">Configure and manage AI models</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Import Model
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Deploy Model
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">Model Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Available Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models.map((model) => (
                    <div 
                      key={model.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel === model.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)}`} />
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {model.type} • {model.parameters} parameters • {model.size}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadge(model.status)}>
                            {model.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            v{model.version}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Accuracy</div>
                          <div className="font-medium">{model.accuracy}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Latency</div>
                          <div className="font-medium">{model.latency}s</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Last Trained</div>
                          <div className="font-medium">{model.lastTrained}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Model Details */}
            <Card>
              <CardHeader>
                <CardTitle>Model Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedModelData && (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground">Selected Model</div>
                      <div className="font-medium">{selectedModelData.name}</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
                        <Progress value={selectedModelData.accuracy} className="h-2" />
                        <div className="text-sm text-right mt-1">{selectedModelData.accuracy}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Performance</div>
                        <Progress value={100 - (selectedModelData.latency * 20)} className="h-2" />
                        <div className="text-sm text-right mt-1">{selectedModelData.latency}s latency</div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Test Model
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retrain
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Slider defaultValue={[0.7]} max={1} min={0} step={0.1} />
                  <div className="text-sm text-muted-foreground">Controls randomness in responses</div>
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" defaultValue="2048" />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Slider defaultValue={[0.9]} max={1} min={0} step={0.1} />
                </div>
                <div className="space-y-2">
                  <Label>Frequency Penalty</Label>
                  <Slider defaultValue={[0]} max={2} min={-2} step={0.1} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-update">Auto Update Models</Label>
                  <Switch id="auto-update" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="fallback">Enable Fallback Models</Label>
                  <Switch id="fallback" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="caching">Enable Response Caching</Label>
                  <Switch id="caching" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Select defaultValue="32">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16">16</SelectItem>
                      <SelectItem value="32">32</SelectItem>
                      <SelectItem value="64">64</SelectItem>
                      <SelectItem value="128">128</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea 
                  id="system-prompt"
                  placeholder="Enter system prompt for the AI model..."
                  className="min-h-[100px]"
                  defaultValue="You are an AI assistant helping students learn English. Be encouraging, patient, and provide clear explanations."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="context-prompt">Context Prompt</Label>
                <Textarea 
                  id="context-prompt"
                  placeholder="Enter context-specific prompts..."
                  className="min-h-[80px]"
                />
              </div>
              <Button>Save Prompts</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2s</div>
                <p className="text-xs text-green-600">↓ 0.3s from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Model Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-green-600">↑ 2.1% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.8%</div>
                <p className="text-xs text-green-600">↑ 0.2% from last week</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {models.map((model) => (
                  <div key={model.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-sm text-muted-foreground">{model.accuracy}%</span>
                    </div>
                    <Progress value={model.accuracy} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Speech Recognition Training</div>
                      <div className="text-sm text-muted-foreground">Started 2 hours ago</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Running</Badge>
                      <div className="text-sm text-muted-foreground mt-1">Progress: 65%</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Text Analysis Fine-tuning</div>
                      <div className="text-sm text-muted-foreground">Completed yesterday</div>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </div>
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Start New Training Job
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset">Training Dataset</Label>
                  <Select defaultValue="english-conversations">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english-conversations">English Conversations</SelectItem>
                      <SelectItem value="academic-texts">Academic Texts</SelectItem>
                      <SelectItem value="mixed-dataset">Mixed Dataset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Learning Rate</Label>
                  <Slider defaultValue={[0.001]} max={0.01} min={0.0001} step={0.0001} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="epochs">Training Epochs</Label>
                  <Input id="epochs" type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validation-split">Validation Split</Label>
                  <Input id="validation-split" type="number" defaultValue="0.2" step="0.1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};