import Image from "next/image";
import React from "react";
import { allAgentSets } from "@/app/agents";
import { AgentConfig } from "@/app/types";
import LanguageSwitcher from "./LanguageSwitcher";

interface AppHeaderProps {
  agentSetKey: string;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  handleAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSelectedAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  agentSetKey,
  selectedAgentName,
  selectedAgentConfigSet,
  handleAgentChange,
  handleSelectedAgentChange,
}) => {
  return (
    <header className="p-5 text-lg font-semibold flex justify-between items-center">
      <div
        className="flex items-center cursor-pointer"
        onClick={() => window.location.reload()}
      >
        <div>
          <Image
            src="/openai-logomark.svg"
            alt="OpenAI Logo"
            width={20}
            height={20}
            className="mr-2"
          />
        </div>
        <div>
          Realtime API <span className="text-gray-500">Agents</span>
        </div>
      </div>
      
      <div className="flex items-center">
        {/* Language Switcher */}
        <div className="mr-6">
          <LanguageSwitcher />
        </div>
        
        {/* Scenario selector */}
        <label className="flex items-center text-base gap-1 mr-2 font-medium">
          Scenario
        </label>
        <div className="relative inline-block">
          <select
            value={agentSetKey}
            onChange={handleAgentChange}
            className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
          >
            {Object.keys(allAgentSets).map((agentKey) => (
              <option key={agentKey} value={agentKey}>
                {agentKey}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Agent selector */}
        {agentSetKey && (
          <div className="flex items-center ml-6">
            <label className="flex items-center text-base gap-1 mr-2 font-medium">
              Agent
            </label>
            <div className="relative inline-block">
              <select
                value={selectedAgentName}
                onChange={handleSelectedAgentChange}
                className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
              >
                {selectedAgentConfigSet?.map((agent) => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader; 