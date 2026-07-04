import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatMessage } from '@/lib/inference-worker';
import { SYSTEM_PROMPT } from '@/constants/system-prompt';

const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX';
const DTYPE = 'q4f16';

export function useInference() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const currentAssistantMessageRef = useRef<string>('');

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../lib/inference-worker.ts', import.meta.url), {
        type: 'module'
      });

      workerRef.current.onmessage = (event) => {
        const { type, token, message } = event.data;

        switch (type) {
          case 'TOKEN':
            currentAssistantMessageRef.current += token;
            setMessages(prev => {
              const newMessages = [...prev];
              // Update the last message (which should be the assistant's)
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                newMessages[newMessages.length - 1].content = currentAssistantMessageRef.current;
              }
              return newMessages;
            });
            break;
          case 'GENERATION_COMPLETE':
            setIsGenerating(false);
            break;
          case 'GENERATION_ERROR':
            console.error('[useInference] Worker error:', message);
            setError(message);
            setIsGenerating(false);
            break;
        }
      };
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const generate = useCallback((userMessage: string) => {
    if (isGenerating) return;

    setError(null);
    setIsGenerating(true);
    currentAssistantMessageRef.current = '';

    setMessages(prev => {
      let baseMessages = [...prev];
      if (baseMessages.length === 0) {
        // Prepend system prompt if it's the first message
        baseMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
      }
      const newMessages: ChatMessage[] = [
        ...baseMessages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '' } // placeholder for streaming
      ];
      
      const worker = getWorker();
      // Send the history without the empty assistant placeholder to the worker
      worker.postMessage({
        type: 'GENERATE',
        messages: newMessages.slice(0, -1),
        modelId: MODEL_ID,
        dtype: DTYPE
      });

      return newMessages;
    });
  }, [getWorker, isGenerating]);

  const stopGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null; // Next generate will spawn a new worker
    }
    setIsGenerating(false);
  }, []);

  return {
    generate,
    stopGeneration,
    messages: messages.filter(m => m.role !== 'system'), // Hide system message from UI
    isGenerating,
    error
  };
}
