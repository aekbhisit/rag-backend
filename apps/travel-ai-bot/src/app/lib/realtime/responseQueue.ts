type Ref<T> = { current: T };

export interface ResponseQueueDeps {
  sendEventSafe: (evt: any) => boolean;
  getSession: () => any | null;
}

export interface ResponseQueueController {
  // Expose refs so the orchestrator can read/update states where needed
  isResponseActiveRef: Ref<boolean>;
  activeResponseIdRef: Ref<string | null>;
  responseCreationLockRef: Ref<boolean>;
  responseCreationQueueRef: Ref<Array<() => Promise<void>>>;
  isProcessingQueueRef: Ref<boolean>;
  responseCompletionPromiseRef: Ref<Promise<void> | null>;
  responseCompletionResolveRef: Ref<(() => void) | null>;

  // Operations
  resetResponseState: () => void;
  waitForResponseDone: () => Promise<void>;
  resetResponseCompletionPromise: () => void;
  processResponseQueue: () => Promise<void>;
  safeCreateResponse: () => Promise<boolean>;
}

/**
 * Create a controller that manages response creation concurrency and lifecycle.
 * Extracted from the useSDKRealtimeSession hook to improve readability and reuse.
 */
export function createResponseQueueController(deps: ResponseQueueDeps): ResponseQueueController {
  const isResponseActiveRef: Ref<boolean> = { current: false };
  const activeResponseIdRef: Ref<string | null> = { current: null };
  const responseCreationLockRef: Ref<boolean> = { current: false };
  const responseCreationQueueRef: Ref<Array<() => Promise<void>>> = { current: [] };
  const isProcessingQueueRef: Ref<boolean> = { current: false };
  const responseCompletionPromiseRef: Ref<Promise<void> | null> = { current: null };
  const responseCompletionResolveRef: Ref<(() => void) | null> = { current: null };

  const resetResponseState = () => {
    isResponseActiveRef.current = false;
    activeResponseIdRef.current = null;
    responseCreationLockRef.current = false;
    responseCreationQueueRef.current = [];
    isProcessingQueueRef.current = false;
    // Intentional: do not reset completion promise here; caller controls it
    console.log('[SDK-Realtime] 🔄 Response state manually reset');
  };

  const waitForResponseDone = () => {
    if (!responseCompletionPromiseRef.current) {
      responseCompletionPromiseRef.current = new Promise<void>((resolve) => {
        responseCompletionResolveRef.current = resolve;
      });
    }
    return responseCompletionPromiseRef.current;
  };

  const resetResponseCompletionPromise = () => {
    responseCompletionPromiseRef.current = null;
    responseCompletionResolveRef.current = null;
  };

  const processResponseQueue = async () => {
    if (isProcessingQueueRef.current || responseCreationQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    while (responseCreationQueueRef.current.length > 0) {
      const responseCreator = responseCreationQueueRef.current.shift();
      if (responseCreator) {
        try {
          await responseCreator();
        } catch (error) {
          console.error('[SDK-Realtime] ❌ Error in response queue processing:', error);
        }
      }
    }

    isProcessingQueueRef.current = false;
  };

  const safeCreateResponse = async (): Promise<boolean> => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[SDK-Realtime] 🔍 safeCreateResponse called:', {
      callId,
      isResponseActive: isResponseActiveRef.current,
      activeResponseId: activeResponseIdRef.current,
      hasSession: !!deps.getSession(),
      isLocked: responseCreationLockRef.current,
      queueLength: responseCreationQueueRef.current.length,
      timestamp: new Date().toISOString()
    });

    return new Promise<boolean>((resolve) => {
      responseCreationQueueRef.current.push(async () => {
        try {
          if (responseCreationLockRef.current) {
            console.log('[SDK-Realtime] ⚠️ Skipping response.create - creation already in progress (locked):', callId);
            resolve(false);
            return;
          }

          if (isResponseActiveRef.current) {
            console.log('[SDK-Realtime] ⚠️ Skipping response.create - response already active:', activeResponseIdRef.current, callId);
            resolve(false);
            return;
          }

          if (!deps.getSession()) {
            console.log('[SDK-Realtime] ⚠️ Skipping response.create - no active session:', callId);
            resolve(false);
            return;
          }

          responseCreationLockRef.current = true;
          isResponseActiveRef.current = true;

          console.log('[SDK-Realtime] 🔒 Lock set, sending response.create event:', callId);
          deps.sendEventSafe({ type: 'response.create' });
          console.log('[SDK-Realtime] ✅ Response creation initiated:', callId);
          resolve(true);
        } catch (error) {
          console.error('[SDK-Realtime] ❌ Failed to create response:', callId, error);
          isResponseActiveRef.current = false;
          responseCreationLockRef.current = false;
          resolve(false);
        }
      });

      // Process the queue
      processResponseQueue();
    });
  };

  return {
    isResponseActiveRef,
    activeResponseIdRef,
    responseCreationLockRef,
    responseCreationQueueRef,
    isProcessingQueueRef,
    responseCompletionPromiseRef,
    responseCompletionResolveRef,
    resetResponseState,
    waitForResponseDone,
    resetResponseCompletionPromise,
    processResponseQueue,
    safeCreateResponse,
  };
}


