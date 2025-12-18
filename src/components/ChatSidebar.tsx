'use client';

import { MessageSquare, Plus } from 'lucide-react';
import { Chat } from '@/lib/supabase';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({ chats, currentChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-3 border-b border-zinc-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
        >
          <Plus size={18} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="text-zinc-500 text-xs text-center mt-4 px-2">
            No chat history yet.
            <br />
            Start a new chat!
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group ${
                  currentChatId === chat.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <MessageSquare size={16} className="flex-shrink-0" />
                <span className="truncate flex-1">{chat.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-800">
        <p className="text-zinc-500 text-[10px] text-center">
          Chats are saved to your wallet
        </p>
      </div>
    </div>
  );
}
