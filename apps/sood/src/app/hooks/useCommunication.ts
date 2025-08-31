import { useState } from "react";
import { SessionStatus } from "@/app/types";
import { useConversationLogger } from "./useConversationLogger";

interface UseCommunicationProps {
  sessionStatus: SessionStatus;
  isPTTActive: boolean;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  cancelAssistantSpeech: (isOutputAudioBufferActive: boolean) => void;
  isOutputAudioBufferActive: boolean;
  connectToRealtime: () => Promise<void>;
  disconnectFromRealtime: () => void;
}

interface UseCommunicationReturn {
  userText: string;
  setUserText: React.Dispatch<React.SetStateAction<string>>;
  isPTTUserSpeaking: boolean;
  isManualDisconnect: boolean;
  handleSendTextMessage: () => void;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  handleCodecChange: (newCodec: string) => void;
  handleModelChange: (newModel: string) => void;
  onToggleConnection: () => void;
}

export function useCommunication({
  sessionStatus,
  isPTTActive, // eslint-disable-line @typescript-eslint/no-unused-vars
  sendClientEvent,
  cancelAssistantSpeech,
  isOutputAudioBufferActive,
  connectToRealtime,
  disconnectFromRealtime,
}: UseCommunicationProps): UseCommunicationReturn {
  const [userText, setUserText] = useState<string>("");
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isManualDisconnect, setIsManualDisconnect] = useState<boolean>(false);
  const { logUserMessage } = useConversationLogger();

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech(isOutputAudioBufferActive);

    // Generate a UUID for the message that will be consistent between client and server
    const messageId = crypto.randomUUID().slice(0, 32);
    const trimmedText = userText.trim();
    
    // Explicitly log the user message
    const sessionId = messageId.substring(0, 8);
    logUserMessage(sessionId, trimmedText);
    
    
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        id: messageId, // Add explicit ID for the message
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: trimmedText }],
      },
    });
    setUserText("");

    sendClientEvent({ type: "response.create" });
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== "CONNECTED") return;
    
    cancelAssistantSpeech(isOutputAudioBufferActive);
    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" });
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== "CONNECTED" || !isPTTUserSpeaking) return;

    setIsPTTUserSpeaking(false);
    
    // Note: We can't log the voice message content here because the transcription
    // hasn't been done yet. The server will send the transcription back via
    // conversation.item.input_audio_transcription.completed event,
    // which is handled in useHandleServerEvent
    
    sendClientEvent({ type: "input_audio_buffer.commit" });
    sendClientEvent({ type: "response.create" });
  };

  // Handle connection toggling with manual disconnect tracking
  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setIsManualDisconnect(true);  // Set flag when user manually disconnects
    } else {
      connectToRealtime();
      setIsManualDisconnect(false); // Clear flag when user manually connects
    }
  };

  // When codec changes, update URL and refresh the page
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  // When model changes, update URL and refresh the page
  const handleModelChange = (newModel: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("model", newModel);
    window.location.replace(url.toString());
  };

  return {
    userText,
    setUserText,
    isPTTUserSpeaking,
    isManualDisconnect,
    handleSendTextMessage,
    handleTalkButtonDown,
    handleTalkButtonUp,
    handleCodecChange,
    handleModelChange,
    onToggleConnection,
  };
} 