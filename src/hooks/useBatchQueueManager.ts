import { useState, useCallback } from 'react';
import type { QueueItem } from '@/types/groupEmailBuilder';

export function useBatchQueueManager() {
  const [queue, setQueue] = useState<Map<string, QueueItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const addToQueue = useCallback((contacts: Array<{ id: string; name: string }>) => {
    const newQueue = new Map(queue);
    contacts.forEach(contact => {
      newQueue.set(contact.id, {
        contactId: contact.id,
        contactName: contact.name,
        status: 'queued',
        progress: 0,
        retryCount: 0,
      });
    });
    setQueue(newQueue);
  }, [queue]);

  const updateQueueItem = useCallback((contactId: string, updates: Partial<QueueItem>) => {
    setQueue(prev => {
      const newQueue = new Map(prev);
      const item = newQueue.get(contactId);
      if (item) {
        newQueue.set(contactId, { ...item, ...updates });
      }
      return newQueue;
    });
  }, []);

  const retryItem = useCallback((contactId: string) => {
    setQueue(prev => {
      const newQueue = new Map(prev);
      const item = newQueue.get(contactId);
      if (item && item.retryCount < 3) {
        newQueue.set(contactId, {
          ...item,
          status: 'queued',
          progress: 0,
          retryCount: item.retryCount + 1,
          error: undefined,
        });
      }
      return newQueue;
    });
  }, []);

  const cancelPending = useCallback(() => {
    // Abort in-flight requests
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Remove queued items and mark running items as failed
    setQueue(prev => {
      const newQueue = new Map(prev);
      newQueue.forEach((item, id) => {
        if (item.status === 'queued') {
          newQueue.delete(id);
        } else if (item.status === 'running') {
          newQueue.set(id, {
            ...item,
            status: 'failed',
            error: 'Cancelled by user',
          });
        }
      });
      return newQueue;
    });
    
    setIsProcessing(false);
  }, [abortController]);

  const clearQueue = useCallback(() => {
    setQueue(new Map());
    setIsProcessing(false);
  }, []);

  const startProcessing = useCallback(() => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    return controller;
  }, []);

  return {
    queue,
    isProcessing,
    setIsProcessing,
    addToQueue,
    updateQueueItem,
    retryItem,
    cancelPending,
    clearQueue,
    startProcessing,
    abortController,
  };
}
