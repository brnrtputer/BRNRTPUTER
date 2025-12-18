'use client';

import ChatLayout from "@/components/ChatLayout";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase, Chat } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Get wallet address when authenticated
  useEffect(() => {
    if (authenticated && user) {
      const address = user.wallet?.address || (user.linkedAccounts?.[0] as any)?.address;
      setWalletAddress(address || null);
    } else {
      setWalletAddress(null);
    }
  }, [authenticated, user]);

  // Load chats when wallet address is available
  useEffect(() => {
    if (walletAddress) {
      loadChats();
    } else {
      setChats([]);
      setCurrentChatId(null);
    }
  }, [walletAddress]);

  // Read chat ID from URL and handle both owned and external chats
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chat');
    if (chatIdFromUrl) {
      // Check if this chat exists in the user's loaded chats
      const chatExists = chats.some(chat => chat.id === chatIdFromUrl);
      if (chatExists) {
        setCurrentChatId(chatIdFromUrl);
      } else if (walletAddress) {
        // Chat might belong to another user - still set it to view
        setCurrentChatId(chatIdFromUrl);
      }
    }
  }, [searchParams, chats, walletAddress]);

  const loadChats = async () => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading chats:', error);
      return;
    }

    setChats(data || []);
  };

  const handleNewChat = async () => {
    // Just clear currentChatId - will create chat on first message
    setCurrentChatId(null);
    router.push('/');
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    router.push(`/?chat=${chatId}`);
  };

  const handleChatCreated = (chatId: string) => {
    setCurrentChatId(chatId);
    router.push(`/?chat=${chatId}`);
    loadChats();
  };

  return (
    <main className="min-h-screen" style={{ background: '#18181b' }}>
      <ChatLayout 
        currentChatId={currentChatId}
        walletAddress={walletAddress}
        chats={chats}
        onChatUpdate={loadChats}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onChatCreated={handleChatCreated}
      />
    </main>
  );
}
