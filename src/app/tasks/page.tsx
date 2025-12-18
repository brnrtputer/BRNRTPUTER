'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare } from 'lucide-react';

interface Message {
  content: string;
  created_at: string;
}

interface Chat {
  id: string;
  wallet_address: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  first_image?: string;
  first_message?: string;
}

export default function TasksPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedChatId, setCopiedChatId] = useState<string | null>(null);

  const copyAddress = (e: React.MouseEvent, address: string, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedChatId(chatId);
    setTimeout(() => setCopiedChatId(null), 2000);
  };

  useEffect(() => {
    loadAllChats();
  }, []);

  const loadAllChats = async () => {
    setLoading(true);

    // Get all chats with message counts
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error loading chats:', chatsError);
      setLoading(false);
      return;
    }

    // Get message counts and first message for each chat
    const chatsWithCounts = await Promise.all(
      (chatsData || []).map(async (chat) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id);

        // Get first user message content
        const { data: firstMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('chat_id', chat.id)
          .eq('role', 'user')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        // Get first image from messages
        const { data: firstImageMsg } = await supabase
          .from('messages')
          .select('image_url, generated_image_url')
          .eq('chat_id', chat.id)
          .or('image_url.not.is.null,generated_image_url.not.is.null')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        const firstImage = firstImageMsg?.image_url || firstImageMsg?.generated_image_url;

        return {
          ...chat,
          message_count: count || 0,
          first_image: firstImage,
          first_message: firstMsg?.content || ''
        };
      })
    );

    setChats(chatsWithCounts);
    setLoading(false);
  };

  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Chat</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">All Tasks</h1>
          <p className="text-zinc-400">
            {chats.length.toLocaleString()} tasks from {new Set(chats.map(c => c.wallet_address)).size} users
          </p>
        </div>

        {/* Chat Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 animate-pulse">
                <div className="aspect-video bg-zinc-800"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-800 rounded w-full"></div>
                  <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-zinc-500">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No tasks yet. Be the first to create one!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/?chat=${chat.id}`}
                className="group bg-black hover:bg-zinc-900/50 rounded-2xl overflow-hidden transition-all cursor-pointer border border-zinc-800 hover:border-zinc-700"
              >
                {/* Image Section */}
                <div className="relative aspect-video overflow-hidden bg-zinc-900">
                  <Image
                    src="/battlefield.jpg"
                    alt={chat.title}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Tags overlay */}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white border border-zinc-700">
                      Agent Topic
                    </span>
                    {chat.message_count && chat.message_count > 5 && (
                      <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white border border-zinc-700">
                        AI Research
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 h-[140px] flex flex-col">
                  {/* Title */}
                  <h3 className="text-purple-400 font-semibold text-base mb-2 line-clamp-2 leading-tight h-[48px]">
                    {chat.title}
                  </h3>
                  
                  {/* Description Preview */}
                  <p className="text-zinc-400 text-sm line-clamp-3 mb-4 leading-relaxed flex-1">
                    {chat.first_message || 'Task conversation...'}
                  </p>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{formatTimeAgo(chat.updated_at)}</span>
                      <button
                        onClick={(e) => copyAddress(e, chat.wallet_address, chat.id)}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-mono transition-colors"
                        title={chat.wallet_address}
                      >
                        {copiedChatId === chat.id ? '✓' : abbreviateAddress(chat.wallet_address)}
                      </button>
                    </div>
                    
                    {/* Message count badge */}
                    <div className="flex items-center gap-1 text-zinc-500">
                      <MessageSquare size={12} />
                      <span>{chat.message_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
