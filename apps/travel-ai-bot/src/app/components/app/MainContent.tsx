import React from "react";
import Transcript from "../ui/Transcript";
import Events from "../events/Events";

interface MainContentProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: () => void;
  downloadRecording: () => Promise<void>;
  canSend: boolean;
  isEventsPaneExpanded: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  userText,
  setUserText,
  onSendMessage,
  downloadRecording,
  canSend,
  isEventsPaneExpanded,
}) => {
  return (
    <main className="flex flex-1 gap-2 px-2 overflow-hidden relative">
      <Transcript
        userText={userText}
        setUserText={setUserText}
        onSendMessage={onSendMessage}
        downloadRecording={downloadRecording}
        canSend={canSend}
      />
      <Events isExpanded={isEventsPaneExpanded} />
    </main>
  );
};

export default MainContent; 