import { IRISMessage, IRISContext } from '@/types/iris';
import { getAuthToken } from '@/utils/authUtils';

export interface StreamingResponse {
  content: string;
  done: boolean;
  error?: string;
}

/**
 * IRIS Streaming Service - Real-time chat responses
 */
export class IRISStreamingService {
  private static readonly SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  private static readonly STREAMING_URL = `${this.SUPABASE_URL}/functions/v1/iris-chat-stream`;

  /**
   * Send a message to IRIS and get streaming response
   */
  static async *streamMessage(
    messages: IRISMessage[],
    userContext: IRISContext
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        yield { content: '', done: true, error: 'Authentication required' };
        return;
      }

      console.log('🚀 Starting IRIS streaming request');

      const response = await fetch(this.STREAMING_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          context: userContext
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield { content: '', done: true, error: `API error (${response.status}): ${errorText}` };
        return;
      }

      if (!response.body) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            console.log('✅ IRIS streaming completed');
            yield { content: '', done: true };
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                yield { content: '', done: true };
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Handle different message types
                if (parsed.type === 'error') {
                  yield { content: '', done: true, error: parsed.error };
                  return;
                }

                if (parsed.type === 'start') {
                  // Initial connection established
                  continue;
                }

                // Handle OpenAI streaming format
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  yield { content: delta.content, done: false };
                }

                // Handle tool calls (for future enhancement)
                if (delta?.tool_calls) {
                  console.log('🛠️ Tool calls detected in stream');
                  // For now, we'll let the stream continue
                  // In the future, we can pause and handle tool calls
                }

              } catch (parseError) {
                console.warn('Failed to parse streaming data:', data, parseError);
                // Continue processing other lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('❌ IRIS Streaming Error:', error);
      
      if (error.name === 'AbortError') {
        yield { 
          content: '', 
          done: true, 
          error: 'Request was cancelled' 
        };
      } else {
        yield { 
          content: '', 
          done: true, 
          error: error instanceof Error ? error.message : 'Unknown streaming error' 
        };
      }
    }
  }

  /**
   * Cancel an ongoing stream
   */
  static cancelStream(controller?: AbortController) {
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Check if streaming is supported
   */
  static isStreamingSupported(): boolean {
    return typeof ReadableStream !== 'undefined' && 
           typeof TextDecoder !== 'undefined';
  }
}
