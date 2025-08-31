"use client";

import React, { useState } from 'react';

interface ChannelPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ChannelPreferencesData;
  onSave: (preferences: ChannelPreferencesData) => void;
}

export interface ChannelPreferencesData {
  preferredChannel: 'auto' | 'normal' | 'realtime' | 'human';
  autoRouting: boolean;
  notifications: {
    channelSwitches: boolean;
    staffAssignment: boolean;
    errors: boolean;
  };
  language: string;
  expertise: string[];
  accessibilityMode: boolean;
  voiceSettings: {
    enabled: boolean;
    autoStart: boolean;
    pushToTalk: boolean;
  };
}

const defaultPreferences: ChannelPreferencesData = {
  preferredChannel: 'auto',
  autoRouting: true,
  notifications: {
    channelSwitches: true,
    staffAssignment: true,
    errors: true
  },
  language: 'en-US',
  expertise: [],
  accessibilityMode: false,
  voiceSettings: {
    enabled: true,
    autoStart: false,
    pushToTalk: false
  }
};

const languages = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français (France)', flag: '🇫🇷' },
  { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
];

const expertiseAreas = [
  { id: 'general_support', name: 'General Support', icon: '💬' },
  { id: 'technical_support', name: 'Technical Support', icon: '🔧' },
  { id: 'billing', name: 'Billing & Payments', icon: '💳' },
  { id: 'account_management', name: 'Account Management', icon: '👤' },
  { id: 'api_integration', name: 'API Integration', icon: '🔌' },
  { id: 'troubleshooting', name: 'Troubleshooting', icon: '🐛' }
];

export default function ChannelPreferences({
  isOpen,
  onClose,
  preferences,
  onSave
}: ChannelPreferencesProps) {
  const [currentPrefs, setCurrentPrefs] = useState<ChannelPreferencesData>(preferences);
  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'notifications' | 'accessibility'>('general');

  const handleSave = () => {
    onSave(currentPrefs);
    onClose();
  };

  const handleReset = () => {
    setCurrentPrefs(defaultPreferences);
  };

  const updatePreference = (path: string, value: any) => {
    setCurrentPrefs(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current: any = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
  };

  const toggleExpertise = (expertiseId: string) => {
    setCurrentPrefs(prev => ({
      ...prev,
      expertise: prev.expertise.includes(expertiseId)
        ? prev.expertise.filter(id => id !== expertiseId)
        : [...prev.expertise, expertiseId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Communication Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'general', name: 'General', icon: '⚙️' },
            { id: 'channels', name: 'Channels', icon: '📡' },
            { id: 'notifications', name: 'Notifications', icon: '🔔' },
            { id: 'accessibility', name: 'Accessibility', icon: '♿' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  value={currentPrefs.language}
                  onChange={(e) => updatePreference('language', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Communication Channel
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'auto', name: 'Auto-select (Recommended)', desc: 'Let the system choose the best channel', icon: '🤖' },
                    { id: 'normal', name: 'AI Assistant', desc: 'Text-based AI responses', icon: '💬' },
                    { id: 'realtime', name: 'Voice Chat', desc: 'Real-time voice conversation', icon: '🎙️' },
                    { id: 'human', name: 'Human Support', desc: 'Connect with a real person', icon: '👨‍💼' }
                  ].map(channel => (
                    <label key={channel.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredChannel"
                        value={channel.id}
                        checked={currentPrefs.preferredChannel === channel.id}
                        onChange={(e) => updatePreference('preferredChannel', e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span>{channel.icon}</span>
                          <span className="font-medium text-gray-900">{channel.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{channel.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expertise Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Areas of Interest (for better staff matching)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {expertiseAreas.map(area => (
                    <label key={area.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrefs.expertise.includes(area.id)}
                        onChange={() => toggleExpertise(area.id)}
                      />
                      <span>{area.icon}</span>
                      <span className="text-sm">{area.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              {/* Auto Routing */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Smart Channel Routing</h3>
                    <p className="text-sm text-gray-600">Automatically switch channels based on your message content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentPrefs.autoRouting}
                      onChange={(e) => updatePreference('autoRouting', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Voice Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Voice Chat Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">Enable Voice Features</span>
                      <p className="text-xs text-gray-500">Allow voice communication in supported channels</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrefs.voiceSettings.enabled}
                        onChange={(e) => updatePreference('voiceSettings.enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {currentPrefs.voiceSettings.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Auto-start voice when available</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentPrefs.voiceSettings.autoStart}
                            onChange={(e) => updatePreference('voiceSettings.autoStart', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Push-to-talk mode</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentPrefs.voiceSettings.pushToTalk}
                            onChange={(e) => updatePreference('voiceSettings.pushToTalk', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {[
                  { key: 'channelSwitches', name: 'Channel Switches', desc: 'Notify when communication channel changes', icon: '🔄' },
                  { key: 'staffAssignment', name: 'Staff Assignment', desc: 'Notify when connected to a human agent', icon: '👋' },
                  { key: 'errors', name: 'System Errors', desc: 'Notify about connection or system issues', icon: '⚠️' }
                ].map(notification => (
                  <div key={notification.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{notification.icon}</span>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{notification.name}</h3>
                        <p className="text-sm text-gray-600">{notification.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrefs.notifications[notification.key as keyof typeof currentPrefs.notifications]}
                        onChange={(e) => updatePreference(`notifications.${notification.key}`, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Tab */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Accessibility Mode</h3>
                  <p className="text-sm text-gray-600">Enhanced keyboard navigation and screen reader support</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPrefs.accessibilityMode}
                    onChange={(e) => updatePreference('accessibilityMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500">ℹ️</span>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Accessibility Features</h3>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Enhanced keyboard navigation</li>
                      <li>• Screen reader compatibility</li>
                      <li>• High contrast mode</li>
                      <li>• Reduced motion animations</li>
                      <li>• Larger click targets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 