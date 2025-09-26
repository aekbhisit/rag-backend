import { BaseChannel } from './BaseChannel';
import { UniversalMessage, ConversationContext, ChannelConfig } from '@/app/types';
import { TextStreamTransport } from '../textstream/transport';
import { buildTextStreamUrl } from '../textstream/sessionAuth';
import { TextResponseMerger } from '../textstream/responseQueue';
import { handleFunctionCall as handleBotUIFunctionCall } from '@/botActionFramework';

export class TextStreamChannel extends BaseChannel {
  private transport: TextStreamTransport | null = null;
  private merger: TextResponseMerger = new TextResponseMerger();

  constructor(config: ChannelConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[TextStreamChannel] Already initialized`);
      return;
    }
    console.log(`[TextStreamChannel] Initializing text stream channel...`);
    this.isInitialized = true;
    console.log(`[TextStreamChannel] ✅ Text stream channel initialized`);
  }

  async processMessage(message: UniversalMessage, context: ConversationContext): Promise<UniversalMessage> {
    console.log(`[TextStreamChannel] Processing message: "${message.content.substring(0, 50)}..."`);

    if (message.type !== 'text') {
      return this.createErrorMessage(
        `TextStreamChannel only supports text messages, received: ${message.type}`,
        message.sessionId
      );
    }

    try {
      // Build SSE URL. Server reconstructs history/agent from DB session and enforces TEXT_MODEL=gpt-4o
      const url = buildTextStreamUrl({
        sessionId: context.sessionId,
        language: context.language,
        text: message.content,
      });

      // Close any previous stream
      try { this.transport?.close(); } catch {}

      // Reset merger for new response
      this.merger.reset();

      // Open new SSE stream
      this.transport = new TextStreamTransport({
        onOpen: () => {
          console.log('[TextStreamChannel] SSE opened');
        },
        onError: (err) => {
          console.error('[TextStreamChannel] SSE error', err);
        },
        onResponseStart: () => {
          console.log('[TextStreamChannel] response_start');
        },
        onDelta: (delta) => {
          const merged = this.merger.append(delta);
          console.log('[TextStreamChannel] delta merged length:', merged.length);
        },
        onResponseDone: (finalText, agentName) => {
          console.log('[TextStreamChannel] response_done, agent:', agentName);
        },
        onAgentTransfer: (agentName) => {
          console.log('[TextStreamChannel] agent_transfer:', agentName);
        },
        onBotAction: async (data) => {
          try {
            console.log('[TextStreamChannel] bot_action received', data);
            if (data?.name === 'navigate' && typeof data?.uri === 'string') {
              const args = { pageName: 'travel', path: data.uri };
              console.log('[TextStreamChannel] bot_action navigate args', args);
              await handleBotUIFunctionCall({ name: 'navigatePage', arguments: JSON.stringify(args) } as any);
              console.log('[TextStreamChannel] bot_action navigate executed');
            }
          } catch (e) {
            console.warn('[TextStreamChannel] bot_action handler failed', e);
          }
        }
      });
      this.transport.open(url);

      // Return immediate ack; UI should reflect streaming via event handlers wired elsewhere
      return this.createSystemMessage(
        'Text message sent via streaming channel',
        message.sessionId
      );
    } catch (error) {
      console.error(`[TextStreamChannel] Error processing message:`, error);
      return this.createErrorMessage(
        `Failed to process message via text stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message.sessionId
      );
    }
  }

  async transferContext(context: ConversationContext): Promise<void> {
    console.log(`[TextStreamChannel] transferContext noop; server reconstructs from DB for SSE`);
  }

  async close(): Promise<void> {
    console.log(`[TextStreamChannel] Closing text stream channel...`);
    try { this.transport?.close(); } catch {}
    this.transport = null;
    this.isInitialized = false;
    console.log(`[TextStreamChannel] Text stream channel closed`);
  }

  isHealthy(): boolean {
    return this.isInitialized; // stateless client; health tied to init
  }
}
