import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { ActionProvider } from "@/botActionFramework/ActionContext";
import App from "../App";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <ActionProvider>
            <App />
          </ActionProvider>
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}


