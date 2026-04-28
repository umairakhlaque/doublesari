import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../socket/client';

interface ChatBoxProps {
  teamChatEnabled: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ teamChatEnabled }) => {
  const { chatMessages } = useGameStore();
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<'table' | 'team'>('table');
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen]);

  const send = () => {
    if (!text.trim()) return;
    getSocket().emit('send_chat', { text: text.trim(), channel });
    setText('');
  };

  return (
    <div className="flex flex-col">
      <button
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
      >
        <span>💬</span>
        <span>Chat</span>
        {chatMessages.length > 0 && (
          <span className="bg-blue-600 text-white text-[10px] px-1 rounded-full">
            {chatMessages.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-1 w-64 bg-gray-900 border border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto max-h-40 p-2 flex flex-col gap-1">
            {chatMessages.length === 0 && (
              <span className="text-gray-600 text-xs text-center py-2">No messages yet</span>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className="text-xs">
                <span
                  className={`font-semibold mr-1 ${msg.channel === 'team' ? 'text-blue-400' : 'text-gray-400'}`}
                >
                  {msg.senderName}
                  {msg.channel === 'team' && ' (team)'}:
                </span>
                <span className="text-gray-200">{msg.text}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-2 flex flex-col gap-1">
            {teamChatEnabled && (
              <div className="flex gap-1">
                {(['table', 'team'] as const).map(ch => (
                  <button
                    key={ch}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors capitalize ${channel === ch ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                    onClick={() => setChannel(ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500"
                placeholder="Type message…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                maxLength={200}
                aria-label="Chat message"
              />
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 rounded-lg transition-colors"
                onClick={send}
                aria-label="Send message"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
