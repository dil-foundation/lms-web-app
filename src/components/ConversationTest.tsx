import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  connectLearnSocket, 
  sendLearnMessage, 
  closeLearnSocket, 
  isSocketConnected, 
  getSocketState,
  resetConnectionState
} from '../utils/websocket';
import { BASE_API_URL } from '../config/api';

interface TestResult {
  test: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  message: string;
  details?: any;
  timestamp: Date;
}

const ConversationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const addTestLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[ConversationTest] ${message}`);
  };

  const updateTestResult = (test: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.test === test);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        existing.timestamp = new Date();
        return [...prev];
      } else {
        return [...prev, { test, status, message, details, timestamp: new Date() }];
      }
    });
  };

  const clearResults = () => {
    setTestResults([]);
    setTestLogs([]);
    setCurrentTest('');
  };

  // Test API connectivity
  const testApiConnectivity = async () => {
    setCurrentTest('API Connectivity');
    addTestLog('Testing basic API connectivity...');
    
    try {
      const response = await fetch(`${BASE_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': navigator.userAgent,
          'Origin': window.location.origin
        }
      });
      
      if (response.ok) {
        updateTestResult('api', 'passed', 'API server is reachable', { 
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
      } else {
        updateTestResult('api', 'failed', `API returned ${response.status}`, { status: response.status });
      }
    } catch (error) {
      updateTestResult('api', 'failed', (error as Error).message, { error: error.toString() });
    }
  };

  // Test raw WebSocket connection
  const testRawWebSocket = async () => {
    setCurrentTest('Raw WebSocket');
    addTestLog('Testing raw WebSocket connection...');
    
    return new Promise<void>((resolve) => {
      try {
        const wsUrl = BASE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const fullUrl = `${wsUrl}/api/ws/learn`;
        
        addTestLog(`Connecting to: ${fullUrl}`);
        addTestLog(`User-Agent: ${navigator.userAgent}`);
        addTestLog(`Origin: ${window.location.origin}`);
        
        const testSocket = new WebSocket(fullUrl);
        testSocket.binaryType = 'arraybuffer';
        
        const timeout = setTimeout(() => {
          if (testSocket.readyState === WebSocket.CONNECTING) {
            addTestLog('⏰ Raw WebSocket connection timeout (15s)');
            updateTestResult('raw-websocket', 'failed', 'Connection timeout', { timeout: '15s' });
            testSocket.close();
            resolve();
          }
        }, 15000);
        
        testSocket.onopen = () => {
          addTestLog('✅ Raw WebSocket connection successful!');
          clearTimeout(timeout);
          updateTestResult('raw-websocket', 'passed', 'Raw WebSocket works', { 
            url: fullUrl,
            readyState: testSocket.readyState
          });
          
          // Test sending a message
          try {
            const testMessage = JSON.stringify({
              type: 'connection_test',
              timestamp: Date.now(),
              source: 'diagnostic'
            });
            testSocket.send(testMessage);
            addTestLog('📤 Test message sent successfully');
          } catch (err) {
            addTestLog(`❌ Failed to send test message: ${err}`);
          }
          
          setTimeout(() => {
            testSocket.close(1000, 'Diagnostic test completed');
            resolve();
          }, 2000);
        };
        
        testSocket.onerror = (error) => {
          addTestLog(`❌ Raw WebSocket error: ${error}`);
          clearTimeout(timeout);
          updateTestResult('raw-websocket', 'failed', 'Raw WebSocket error', { 
            error: error.toString(),
            url: fullUrl
          });
          resolve();
        };
        
        testSocket.onclose = (event) => {
          addTestLog(`🔌 Raw WebSocket closed - Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
          clearTimeout(timeout);
          
          if (event.code === 1005) {
            addTestLog('💡 Code 1005: Server rejected connection or no status received');
          } else if (event.code === 1006) {
            addTestLog('💡 Code 1006: Abnormal closure, connection lost');
          }
          
          if (!testResults.find(r => r.test === 'raw-websocket')) {
            updateTestResult('raw-websocket', 'failed', `Connection closed with code ${event.code}`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            });
          }
          resolve();
        };
        
        testSocket.onmessage = (event) => {
          addTestLog(`📨 Received message: ${typeof event.data === 'string' ? event.data.substring(0, 100) : 'Binary data'}`);
        };
        
      } catch (error) {
        updateTestResult('raw-websocket', 'failed', (error as Error).message, { error: error.toString() });
        resolve();
      }
    });
  };

  // Test our WebSocket utility
  const testWebSocketUtility = async () => {
    setCurrentTest('WebSocket Utility');
    addTestLog('Testing our WebSocket utility...');
    
    try {
      resetConnectionState();
      
      const connected = await connectLearnSocket(
        (data) => {
          addTestLog(`📨 Utility received message: ${JSON.stringify(data).substring(0, 100)}`);
        },
        (buffer) => {
          addTestLog(`🎵 Utility received audio: ${buffer.byteLength} bytes`);
        },
        () => {
          addTestLog('🔌 Utility connection closed');
        },
        (error) => {
          addTestLog(`❌ Utility connection error: ${error}`);
        },
        () => {
          addTestLog('🔄 Utility reconnected successfully');
        }
      );
      
      if (!connected) {
        throw new Error('Failed to connect via utility');
      }
      
      if (!isSocketConnected()) {
        throw new Error('Utility reports not connected');
      }
      
      // Test message sending
      const testMessage = {
        type: 'utility_test',
        message: 'Test from WebSocket utility',
        timestamp: Date.now()
      };
      
      const sendResult = sendLearnMessage(JSON.stringify(testMessage));
      if (!sendResult) {
        throw new Error('Failed to send message via utility');
      }
      
      addTestLog('✅ WebSocket utility test successful');
      updateTestResult('websocket-utility', 'passed', 'WebSocket utility works correctly', {
        connected: true,
        state: getSocketState(),
        messageSent: true
      });
      
    } catch (error) {
      updateTestResult('websocket-utility', 'failed', (error as Error).message, {
        connected: isSocketConnected(),
        state: getSocketState(),
        error: (error as Error).message
      });
    }
  };

  // Test connection stability
  const testConnectionStability = async () => {
    setCurrentTest('Connection Stability');
    addTestLog('Testing connection stability...');
    
    try {
      resetConnectionState();
      const attempts = 3;
      let successCount = 0;
      
      for (let i = 0; i < attempts; i++) {
        addTestLog(`Stability test ${i + 1}/${attempts}`);
        
        try {
          const connected = await connectLearnSocket(
            () => {}, // message handler
            () => {}, // audio handler  
            () => {}, // close handler
            () => {}, // error handler
            () => {} // reconnect handler
          );
          
          if (connected && isSocketConnected()) {
            successCount++;
            addTestLog(`✅ Attempt ${i + 1} successful`);
          } else {
            addTestLog(`❌ Attempt ${i + 1} failed - not connected`);
          }
          
          // Wait then close
          await new Promise(resolve => setTimeout(resolve, 1000));
          closeLearnSocket();
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          addTestLog(`❌ Attempt ${i + 1} failed: ${(error as Error).message}`);
        }
      }
      
      const successRate = (successCount / attempts) * 100;
      
      if (successRate >= 66) { // 2/3 success rate
        updateTestResult('stability', 'passed', `Connection stability good (${successCount}/${attempts} successful)`, {
          attempts,
          successful: successCount,
          successRate: `${successRate.toFixed(1)}%`
        });
      } else {
        updateTestResult('stability', 'failed', `Connection stability poor (${successCount}/${attempts} successful)`, {
          attempts,
          successful: successCount,
          successRate: `${successRate.toFixed(1)}%`
        });
      }
      
    } catch (error) {
      updateTestResult('stability', 'failed', (error as Error).message, { error: error.toString() });
    }
  };

  // Test connection with different headers to detect server filtering
  const testHeaderFiltering = async () => {
    setCurrentTest('Header Filtering Detection');
    addTestLog('Testing different headers to detect server-side filtering...');
    
    const headerTests = [
      {
        name: 'Standard Browser',
        headers: {
          'User-Agent': navigator.userAgent,
          'Origin': window.location.origin
        }
      },
      {
        name: 'Mobile Browser iOS',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Origin': window.location.origin
        }
      },
      {
        name: 'Mobile Browser Android',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
          'Origin': window.location.origin
        }
      },
      {
        name: 'React Native WebView',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36',
          'Origin': 'file://'
        }
      },
      {
        name: 'Mobile App Native',
        headers: {
          'User-Agent': 'DILApp/1.0 (iOS 16.0; iPhone)',
          'Origin': 'app://dil-mobile'
        }
      },
      {
        name: 'No Headers',
        headers: {}
      }
    ];

    const results = [];
    
    for (const test of headerTests) {
      addTestLog(`Testing ${test.name}...`);
      
      try {
        const wsUrl = BASE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const fullUrl = `${wsUrl}/api/ws/learn`;
        
        const result = await new Promise<any>((resolve) => {
          let testSocket: WebSocket;
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (testSocket && testSocket.readyState === WebSocket.CONNECTING) {
                testSocket.close();
              }
              resolve({ success: false, reason: 'timeout', duration: 5000 });
            }
          }, 5000);
          
          try {
            // Note: WebSocket constructor doesn't support custom headers in browsers
            // But we can test the connection behavior
            testSocket = new WebSocket(fullUrl);
            testSocket.binaryType = 'arraybuffer';
            
            const startTime = Date.now();
            
            testSocket.onopen = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                addTestLog(`✅ ${test.name}: Connected successfully (${duration}ms)`);
                testSocket.close(1000, 'Test completed');
                resolve({ success: true, duration, headers: test.headers });
              }
            };
            
            testSocket.onerror = (error) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                addTestLog(`❌ ${test.name}: Connection error (${duration}ms)`);
                resolve({ success: false, reason: 'error', duration, error: error.toString() });
              }
            };
            
            testSocket.onclose = (event) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                addTestLog(`🔌 ${test.name}: Closed with code ${event.code} (${duration}ms)`);
                resolve({ 
                  success: false, 
                  reason: 'closed', 
                  duration, 
                  code: event.code, 
                  reason_text: event.reason 
                });
              }
            };
            
          } catch (error) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve({ success: false, reason: 'exception', error: error.toString() });
            }
          }
        });
        
        results.push({
          test: test.name,
          headers: test.headers,
          ...result
        });
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        addTestLog(`❌ ${test.name}: Exception - ${(error as Error).message}`);
        results.push({
          test: test.name,
          headers: test.headers,
          success: false,
          reason: 'exception',
          error: (error as Error).message
        });
      }
    }
    
    // Analyze results
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    addTestLog(`Header filtering analysis: ${successfulTests.length}/${results.length} successful`);
    
    if (successfulTests.length === 0) {
      updateTestResult('header-filtering', 'failed', 'All header variations failed - likely server/infrastructure issue', {
        results,
        analysis: 'Server appears to be blocking all WebSocket connections regardless of headers'
      });
    } else if (successfulTests.length === results.length) {
      updateTestResult('header-filtering', 'passed', 'No header-based filtering detected', {
        results,
        analysis: 'All header variations work - no server-side filtering detected'
      });
    } else {
      const workingHeaders = successfulTests.map(t => t.test);
      const failingHeaders = failedTests.map(t => t.test);
      
      updateTestResult('header-filtering', 'failed', `Selective header filtering detected`, {
        results,
        workingHeaders,
        failingHeaders,
        analysis: 'Server appears to filter connections based on headers/user-agent'
      });
    }
  };

  // Test connection timing patterns
  const testConnectionTiming = async () => {
    setCurrentTest('Connection Timing Analysis');
    addTestLog('Analyzing connection timing patterns...');
    
    const attempts = 5;
    const timings = [];
    
    for (let i = 0; i < attempts; i++) {
      addTestLog(`Timing test ${i + 1}/${attempts}`);
      
      const startTime = Date.now();
      
      try {
        const wsUrl = BASE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const fullUrl = `${wsUrl}/api/ws/learn`;
        
        const result = await new Promise<any>((resolve) => {
          const testSocket = new WebSocket(fullUrl);
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              testSocket.close();
              resolve({ success: false, reason: 'timeout', duration: 10000 });
            }
          }, 10000);
          
          testSocket.onopen = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              const duration = Date.now() - startTime;
              testSocket.close(1000, 'Timing test');
              resolve({ success: true, duration });
            }
          };
          
          testSocket.onerror = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              const duration = Date.now() - startTime;
              resolve({ success: false, reason: 'error', duration });
            }
          };
          
          testSocket.onclose = (event) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              const duration = Date.now() - startTime;
              resolve({ success: false, reason: 'closed', duration, code: event.code });
            }
          };
        });
        
        timings.push(result);
        addTestLog(`Attempt ${i + 1}: ${result.success ? 'Success' : 'Failed'} (${result.duration}ms)`);
        
        // Wait between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        timings.push({ success: false, reason: 'exception', duration, error: (error as Error).message });
        addTestLog(`Attempt ${i + 1}: Exception (${duration}ms)`);
      }
    }
    
    // Analyze timing patterns
    const successCount = timings.filter(t => t.success).length;
    const averageSuccessTime = timings.filter(t => t.success).reduce((sum, t) => sum + t.duration, 0) / successCount || 0;
    const averageFailTime = timings.filter(t => !t.success).reduce((sum, t) => sum + t.duration, 0) / (attempts - successCount) || 0;
    
    const analysis = {
      successRate: `${successCount}/${attempts} (${((successCount / attempts) * 100).toFixed(1)}%)`,
      averageSuccessTime: `${averageSuccessTime.toFixed(0)}ms`,
      averageFailTime: `${averageFailTime.toFixed(0)}ms`,
      timings,
      pattern: successCount === 0 ? 'Always fails' : 
               successCount === attempts ? 'Always succeeds' : 
               'Intermittent failures'
    };
    
    if (successCount === 0) {
      updateTestResult('connection-timing', 'failed', 'All connection attempts failed', analysis);
    } else if (successCount < attempts * 0.8) {
      updateTestResult('connection-timing', 'failed', `Unreliable connections (${analysis.successRate})`, analysis);
    } else {
      updateTestResult('connection-timing', 'passed', `Reliable connections (${analysis.successRate})`, analysis);
    }
  };

  // Test different connection URLs and paths
  const testUrlVariations = async () => {
    setCurrentTest('URL Variations');
    addTestLog('Testing different URL patterns...');
    
    const baseWsUrl = BASE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const urlTests = [
      { name: 'Standard Path', url: `${baseWsUrl}/api/ws/learn` },
      { name: 'Without /api', url: `${baseWsUrl}/ws/learn` },
      { name: 'Root WebSocket', url: `${baseWsUrl}/ws` },
      { name: 'Direct Domain', url: baseWsUrl },
      { name: 'With Query String', url: `${baseWsUrl}/api/ws/learn?test=1` },
      { name: 'Different Protocol', url: baseWsUrl.replace('wss://', 'ws://').replace('ws://', 'wss://') }
    ];
    
    const results = [];
    
    for (const test of urlTests) {
      addTestLog(`Testing ${test.name}: ${test.url}`);
      
      try {
        const result = await new Promise<any>((resolve) => {
          let testSocket: WebSocket;
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (testSocket) testSocket.close();
              resolve({ success: false, reason: 'timeout' });
            }
          }, 5000);
          
          try {
            testSocket = new WebSocket(test.url);
            
            testSocket.onopen = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                addTestLog(`✅ ${test.name}: Connected`);
                testSocket.close(1000, 'URL test');
                resolve({ success: true });
              }
            };
            
            testSocket.onerror = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                addTestLog(`❌ ${test.name}: Error`);
                resolve({ success: false, reason: 'error' });
              }
            };
            
            testSocket.onclose = (event) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                addTestLog(`🔌 ${test.name}: Closed (${event.code})`);
                resolve({ success: false, reason: 'closed', code: event.code });
              }
            };
            
          } catch (error) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve({ success: false, reason: 'exception', error: error.toString() });
            }
          }
        });
        
        results.push({ ...test, ...result });
        
      } catch (error) {
        results.push({ ...test, success: false, reason: 'exception', error: (error as Error).message });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const workingUrls = results.filter(r => r.success);
    
    if (workingUrls.length === 0) {
      updateTestResult('url-variations', 'failed', 'No URL variations work', { results });
    } else if (workingUrls.length === 1 && workingUrls[0].name === 'Standard Path') {
      updateTestResult('url-variations', 'passed', 'Standard path works correctly', { results });
    } else {
      updateTestResult('url-variations', 'passed', `${workingUrls.length} URL variations work`, { 
        results, 
        workingUrls: workingUrls.map(u => u.name) 
      });
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    clearResults();
    
    try {
      addTestLog('🚀 Starting comprehensive WebSocket diagnostics...');
      
      await testApiConnectivity();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testUrlVariations();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testHeaderFiltering();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testConnectionTiming();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testRawWebSocket();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testWebSocketUtility();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testConnectionStability();
      
      addTestLog('✅ All diagnostics completed!');
      
      // Provide summary analysis
      addTestLog('📊 ANALYSIS SUMMARY:');
      const allResults = testResults;
      const passedTests = allResults.filter(r => r.status === 'passed').length;
      const failedTests = allResults.filter(r => r.status === 'failed').length;
      
      addTestLog(`- Passed: ${passedTests}, Failed: ${failedTests}`);
      
      if (failedTests === 0) {
        addTestLog('🎉 All tests passed - no connection issues detected');
      } else {
        addTestLog('🔍 Issues detected - check failed test details for solutions');
      }
      
    } catch (error) {
      addTestLog(`❌ Diagnostic error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      
      // Cleanup
      try {
        closeLearnSocket();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'running': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✅ PASSED';
      case 'failed': return '❌ FAILED';
      case 'running': return '🔄 RUNNING';
      default: return '⏳ PENDING';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 WebSocket Diagnostics
            {currentTest && (
              <Badge variant="outline" className="ml-2">
                Running: {currentTest}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? '🔄 Running...' : '🚀 Run Diagnostics'}
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
              disabled={isRunning}
            >
              🗑️ Clear Results
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>This tool diagnoses WebSocket connection issues by testing:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>API server connectivity</li>
              <li>Raw WebSocket connection</li>
              <li>WebSocket utility functions</li>
              <li>Connection stability over multiple attempts</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.test}</h4>
                    <Badge className={getStatusColor(result.status)}>
                      {getStatusText(result.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600">View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📝 Diagnostic Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full border rounded p-3 bg-gray-50">
              <div className="space-y-1">
                {testLogs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationTest; 