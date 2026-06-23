// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { generateArchitectureWithAI, isAzureOpenAIConfigured } from '../services/azureOpenAI';
import { useModelSettings, MODEL_CONFIG } from '../stores/modelSettingsStore';
import {
  buildModificationPrompt,
  summarizeArchitectureChange,
  CurrentArchitecture,
} from '../services/modificationPrompt';
import './ArchitectureChatPanel.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  ts: number;
}

interface ArchitectureChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentArchitecture: CurrentArchitecture;
  /** Applies a generated architecture to the canvas (App's handleAIGenerate). */
  onApply: (architecture: any, prompt: string, autoSnapshot?: boolean) => void | Promise<void>;
}

const SUGGESTIONS = [
  'Add Azure Front Door with WAF in front of the web tier',
  'Make it zone-redundant for high availability',
  'Add a Redis cache between the API and the database',
  'Add monitoring with Application Insights and Log Analytics',
  'Put private endpoints on the data services',
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ArchitectureChatPanel: React.FC<ArchitectureChatPanelProps> = ({
  isOpen,
  onClose,
  currentArchitecture,
  onApply,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modelSettings] = useModelSettings();

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const configured = isAzureOpenAIConfigured();
  const hasDiagram = currentArchitecture.nodes.some((n) => n.type === 'azureNode');
  const modelName = MODEL_CONFIG[modelSettings.model]?.displayName || modelSettings.model;

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || isSending) return;

      setInput('');
      const userMsg: ChatMessage = { id: uid(), role: 'user', text, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsSending(true);

      // Snapshot the canvas state BEFORE applying so we can diff for a summary.
      const before: CurrentArchitecture = {
        nodes: currentArchitecture.nodes,
        edges: currentArchitecture.edges,
        architectureName: currentArchitecture.architectureName,
      };

      // Recent user instructions help the model resolve references.
      const recentRequests = [...messages, userMsg]
        .filter((m) => m.role === 'user')
        .slice(-5)
        .map((m) => m.text);

      try {
        const prompt = buildModificationPrompt(before, text, recentRequests.slice(0, -1));
        const result = await generateArchitectureWithAI(prompt);

        await onApply(result, text, true);

        const summary = summarizeArchitectureChange(before, result);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', text: summary, ts: Date.now() },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'error',
            text: err?.message || 'Something went wrong updating the diagram. Please try again.',
            ts: Date.now(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, currentArchitecture, onApply],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="arch-chat-panel" role="complementary" aria-label="Architecture chat">
      <div className="arch-chat-header">
        <div className="arch-chat-title">
          <MessageSquare size={18} />
          <span>Architecture Chat</span>
        </div>
        <button className="arch-chat-close" onClick={onClose} title="Close chat" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="arch-chat-subhead">
        <Sparkles size={13} />
        <span>
          Iteratively refine your diagram in plain English · <strong>{modelName}</strong>
        </span>
      </div>

      <div className="arch-chat-thread" ref={threadRef}>
        {messages.length === 0 && (
          <div className="arch-chat-empty">
            <p className="arch-chat-empty-title">
              {hasDiagram
                ? 'Describe a change and I’ll update the diagram.'
                : 'Describe an architecture to get started, then keep refining it here.'}
            </p>
            <div className="arch-chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="arch-chat-chip"
                  disabled={isSending || !configured}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`arch-chat-msg arch-chat-msg-${m.role}`}>
            {m.role === 'error' && <AlertCircle size={15} className="arch-chat-msg-icon" />}
            {m.role === 'assistant' && <Sparkles size={15} className="arch-chat-msg-icon" />}
            <div className="arch-chat-bubble">{m.text}</div>
          </div>
        ))}

        {isSending && (
          <div className="arch-chat-msg arch-chat-msg-assistant">
            <Loader2 size={15} className="arch-chat-msg-icon spin" />
            <div className="arch-chat-bubble arch-chat-bubble-pending">Updating the diagram…</div>
          </div>
        )}
      </div>

      <div className="arch-chat-composer">
        {!configured && (
          <div className="arch-chat-warning">
            <AlertCircle size={14} /> Azure OpenAI is not configured.
          </div>
        )}
        <div className="arch-chat-input-row">
          <textarea
            ref={inputRef}
            className="arch-chat-input"
            placeholder={hasDiagram ? 'e.g. add a load balancer in front of the VMs' : 'Describe your architecture…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isSending || !configured}
          />
          <button
            className="arch-chat-send"
            onClick={() => send(input)}
            disabled={isSending || !configured || !input.trim()}
            title="Send (Enter)"
            aria-label="Send"
          >
            {isSending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="arch-chat-hint">Enter to send · Shift+Enter for a new line · each change is auto-saved to version history</div>
      </div>
    </div>
  );
};

export default ArchitectureChatPanel;
