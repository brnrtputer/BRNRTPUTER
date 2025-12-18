'use client';

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import SlashCommandMenu from "./SlashCommandMenu";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { LogOut, Image as ImageIcon, MessageSquare, Plus } from 'lucide-react';
import { supabase, Message as DBMessage, STORAGE_BUCKET } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  generatedImage?: string;
  timestamp: string;
}

interface ChatLayoutProps {
  currentChatId: string | null;
  walletAddress: string | null;
  chats: any[];
  onChatUpdate: () => void;
  onNewChat: () => Promise<void>;
  onSelectChat: (chatId: string) => void;
  onChatCreated: (chatId: string) => void;
}

export default function ChatLayout({ currentChatId, walletAddress, chats, onChatUpdate, onNewChat, onSelectChat, onChatCreated }: ChatLayoutProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [totalMessages, setTotalMessages] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [currentChatOwner, setCurrentChatOwner] = useState<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  // Get wallet address from user's linked wallets or embedded wallet
  const userWalletAddress = wallets.length > 0 
    ? wallets[0].address 
    : user?.wallet?.address;
  
  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Load total message count on mount and when wallet changes
  useEffect(() => {
    if (walletAddress) {
      loadMessageCount(true); // Show skeleton on initial load
    }
  }, [walletAddress]);

  // Update message count when messages change (silently, no skeleton)
  useEffect(() => {
    if (walletAddress && messages.length > 0) {
      loadMessageCount(false); // Don't show skeleton on updates
    }
  }, [messages.length]);

  // Load messages when chat changes and auto-focus input
  useEffect(() => {
    if (currentChatId) {
      loadMessages();
      // Auto-focus input when selecting a chat
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setMessages([]);
      setCurrentChatOwner(null); // Reset owner when starting new chat
      // Auto-focus input for new chat
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentChatId]);

  const loadMessageCount = async (showSkeleton: boolean = true) => {
    if (showSkeleton) {
      setLoadingCount(true);
    }
    
    // Get TOTAL count of ALL messages from ALL users (global count)
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error loading message count:', error);
      setLoadingCount(false);
      return;
    }

    setTotalMessages(count || 0);
    setLoadingCount(false);
  };

  const loadMessages = async () => {
    if (!currentChatId) {
      setCurrentChatOwner(null);
      return;
    }

    // First, get the chat to check ownership
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('wallet_address')
      .eq('id', currentChatId)
      .single();

    if (chatError) {
      console.error('Error loading chat:', chatError);
      setCurrentChatOwner(null);
      return;
    }

    setCurrentChatOwner(chatData.wallet_address);

    // Now load messages
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    // Convert DB messages to UI messages
    const uiMessages: Message[] = (data || []).map((msg: DBMessage) => ({
      role: msg.role,
      content: msg.content,
      image: msg.image_url,
      generatedImage: msg.generated_image_url,
      timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }));

    setMessages(uiMessages);
  };

  const saveMessage = async (message: Message, chatId?: string) => {
    const chatIdToUse = chatId || currentChatId;
    if (!chatIdToUse) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatIdToUse,
        role: message.role,
        content: message.content,
        image_url: message.image,
        generated_image_url: message.generatedImage
      });

    if (error) {
      console.error('Error saving message:', error);
    }

    // Update chat's updated_at timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentChatId);

    // Update chat title if this is the first user message
    if (message.role === 'user' && messages.length === 0) {
      const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
      await supabase
        .from('chats')
        .update({ title })
        .eq('id', currentChatId);
      
      onChatUpdate();
    }
  };

  const uploadImageToStorage = async (base64Image: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Image);
      const blob = await response.blob();
      
      // Generate unique filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const filepath = `${walletAddress}/${filename}`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filepath, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filepath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      return null;
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing, isSaving, isSaved]);

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Show menu if input is "/" or starts with "/"
    if (value === '/' || value.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleCommandSelect = async (command: string) => {
    setShowSlashMenu(false);
    
    if (command === 'generate') {
      // Enter generate mode - show inline indicator
      setIsGenerateMode(true);
      setInputValue('');
      // Focus the input
      inputRef.current?.focus();
    }
    
    setInputValue('');
  };

  const handleImageGeneration = async (prompt: string, skipUserMessage = false) => {
    // Only add user message if not already added
    if (!skipUserMessage) {
      const userMsg: Message = {
        role: 'user',
        content: prompt,
        timestamp: getTimestamp()
      };
      setMessages(prev => [...prev, userMsg]);
      await saveMessage(userMsg);
    }

    setIsAnalyzing(true);

    // Add "Generating image..." message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Generating image',
      timestamp: getTimestamp()
    }]);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();

      // Remove "Generating..." message and add generated image
      setMessages(prev => prev.slice(0, -1));
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.revisedPrompt || data.originalPrompt,
        generatedImage: data.imageUrl,
        timestamp: getTimestamp()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      await saveMessage(assistantMsg);

      // Show saving status
      setIsAnalyzing(false);
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1000);

    } catch (error: any) {
      setMessages(prev => {
        const newMessages = prev.slice(0, -1);
        return [...newMessages, {
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: getTimestamp()
        }];
      });
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    // Require wallet connection
    if (!authenticated || !walletAddress) {
      alert('Please connect your wallet to start chatting');
      return;
    }

    const message = inputValue.trim();
    if (!message) return;

    // Clear input
    setInputValue('');

    // Track the chat ID to use for this message
    let chatIdToUse = currentChatId;

    // If no chat exists, create one automatically
    if (!currentChatId && walletAddress) {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          wallet_address: walletAddress,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        return;
      }

      chatIdToUse = data.id;
      // Notify parent about the new chat
      onChatCreated(data.id);
    }

    // If in generate mode, directly generate image
    if (isGenerateMode) {
      setIsGenerateMode(false);
      await handleImageGeneration(message);
      return;
    }

    // Add user message
    const userMsg: Message = {
      role: 'user',
      content: message,
      timestamp: getTimestamp()
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(userMsg, chatIdToUse || undefined);

    setIsAnalyzing(true);

    // Add "Thinking" message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Thinking',
      timestamp: getTimestamp()
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Check if response is JSON (image generation request detected)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        if (data.shouldGenerateImage) {
          // Remove "Thinking" message
          setMessages(prev => prev.slice(0, -1));
          
          // Call image generation with skipUserMessage=true since user message already added
          await handleImageGeneration(data.prompt || message, true);
          return;
        }
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      // Remove "Thinking" message and start streaming
      setMessages(prev => prev.slice(0, -1));
      const streamTimestamp = getTimestamp();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: streamTimestamp
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: accumulatedText,
            timestamp: streamTimestamp
          };
          return newMessages;
        });
      }

      // Save the complete assistant message with the correct chat ID
      const assistantMsg: Message = {
        role: 'assistant',
        content: accumulatedText,
        timestamp: streamTimestamp
      };
      await saveMessage(assistantMsg, chatIdToUse || undefined);

      // Show saving status
      setIsAnalyzing(false);
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1000);

    } catch (error: any) {
      setMessages(prev => {
        const newMessages = prev.slice(0, -1);
        return [...newMessages, {
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: getTimestamp()
        }];
      });
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && isGenerateMode) {
      e.preventDefault();
      setIsGenerateMode(false);
      setInputValue('');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (file: File) => {
    // Require wallet connection
    if (!authenticated || !walletAddress) {
      alert('Please connect your wallet to upload images');
      return;
    }

    setShowSlashMenu(false);
    
    // Track the chat ID to use for this image
    let chatIdToUse = currentChatId;

    // If no chat exists, create one automatically with filename as title
    if (!currentChatId && walletAddress) {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          wallet_address: walletAddress,
          title: `Image: ${file.name}`
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        alert('Failed to create chat');
        return;
      }

      chatIdToUse = data.id;
      // Notify parent about the new chat
      onChatCreated(data.id);
    }
    
    // Convert file to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      
      // Upload to Supabase storage
      const imageUrl = await uploadImageToStorage(base64Image);
      
      // Add user message with image
      const userMsg: Message = {
        role: 'user',
        content: '',
        image: imageUrl || base64Image,
        timestamp: getTimestamp()
      };
      setMessages(prev => [...prev, userMsg]);
      await saveMessage(userMsg, chatIdToUse || undefined);
      
      setIsAnalyzing(true);
      
      // Add initial "Thinking..." message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Thinking',
        timestamp: getTimestamp()
      }]);
      
      try {
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64Image,
            prompt: "Analyze this image in detail. Describe what you see."
          }),
        });
        
        if (!response.ok || !response.body) {
          throw new Error('Failed to get response');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        
        // Remove "Thinking..." message and start streaming
        setMessages(prev => prev.slice(0, -1));
        const streamTimestamp = getTimestamp();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          timestamp: streamTimestamp
        }]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          // Update the last message with accumulated text
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: accumulatedText,
              timestamp: streamTimestamp
            };
            return newMessages;
          });
        }

        // Save the complete assistant message
        const assistantMsg: Message = {
          role: 'assistant',
          content: accumulatedText,
          timestamp: streamTimestamp
        };
        await saveMessage(assistantMsg, chatIdToUse || undefined);
        
        // After streaming completes, show saving status
        setIsAnalyzing(false);
        setIsSaving(true);
        
        // Simulate saving delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsSaving(false);
        setIsSaved(true);
        
        // Hide saved status after 2 seconds
        setTimeout(() => setIsSaved(false), 2000);
        
      } catch (error: any) {
        setMessages(prev => {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, {
            role: 'assistant',
            content: `Error: ${error.message}`,
            timestamp: getTimestamp()
          }];
        });
        setIsAnalyzing(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show wallet connection prompt if not authenticated
  if (!authenticated || !walletAddress) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Image
            src="/brnrtputer.png"
            alt="Logo"
            width={120}
            height={120}
            className="mx-auto mb-6"
          />
          <h2 className="text-white text-2xl mb-4 font-mono">Welcome to BRNRTPUTER</h2>
          <p className="text-zinc-400 mb-6">Connect your wallet to start chatting</p>
          <button 
            onClick={login}
            className="px-6 py-3 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-7xl h-[94vh] flex bg-black rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-black border-r border-zinc-800 flex flex-col">
        {/* New Chat Button in Sidebar */}
        <div className="p-3 border-b border-zinc-800">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-black hover:bg-zinc-800/50 rounded-lg text-white text-sm transition-colors cursor-pointer"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2 chat-scrollbar">
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
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group cursor-pointer ${
                    currentChatId === chat.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <Image
                    src="/robot.png"
                    alt=""
                    width={16}
                    height={16}
                    className="flex-shrink-0 rounded"
                  />
                  <span className="truncate flex-1">{chat.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-zinc-800">
          <p className="text-zinc-500 text-[10px] text-center">
            Chats saved to your wallet
          </p>
        </div>
        </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with logo and agent name */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 bg-black/50" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <Image
                src="/brnrtputer.png"
                alt="Agent Logo"
                width={56}
                height={56}
                className="rounded cursor-pointer"
              />
              <div className="flex flex-col">
                <h1 className="text-white text-3xl hover:text-zinc-400 transition-colors cursor-pointer">BRNRTPUTER</h1>
                <div className="flex items-center gap-2 -mt-1">
                  <a href="/about" className="text-zinc-400 text-xs hover:text-blue-400 transition-colors underline">about</a>
                  <a href="https://x.com/brnrtputer" target="_blank" rel="noopener noreferrer" className="text-zinc-400 text-xs hover:text-blue-400 transition-colors underline">@brnrtputer</a>
                </div>
              </div>
            </div>
            {loadingCount ? (
              <span className="text-green-500 text-sm font-medium ml-2">
                <span className="inline-block w-12 h-4 bg-zinc-700 rounded animate-pulse"></span> tasks
              </span>
            ) : (
              <span className="text-green-500 text-sm font-medium ml-2">{totalMessages?.toLocaleString()} tasks</span>
            )}
            <a href="/tasks" target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm font-medium ml-2 underline cursor-pointer hover:text-blue-400 transition-colors">
              View Tasks
            </a>
          </div>
          
          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            {(isAnalyzing || isSaving || isSaved) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono">
                {isAnalyzing && (
                  <span className="text-yellow-500 thinking-dots">Typing</span>
                )}
                {isSaving && (
                  <span className="text-green-500 thinking-dots">Saving</span>
                )}
                {isSaved && (
                  <span className="text-green-500">Saved ✓</span>
                )}
              </div>
            )}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-md text-white text-xs hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
              </svg>
              GitHub
            </a>
            {ready && authenticated && userWalletAddress && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-md text-white text-xs">
                <span>{abbreviateAddress(userWalletAddress)}</span>
                <button
                  onClick={logout}
                  className="hover:opacity-70 transition-opacity cursor-pointer"
                  title="Disconnect wallet"
                >
                  <LogOut size={14} className="scale-x-[-1]" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Description text */}
        <div className="px-8 pb-6">
          <p className="text-zinc-400 text-base" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Task agent with images, files, or prompts — then observe its responses as they're recorded into the Brainrot dataset. Each task contributes to an evolving research archive.
          </p>
        </div>
        
        {/* Chat content area */}
        <div className="flex-1 p-8 overflow-y-auto chat-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full -mt-12">
              {/* Supply text above */}
              <p className="text-sm mb-8 max-w-2xl text-center">
                <span className="bg-gradient-to-r from-orange-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
BRNRTPUTER is an experimental agent that converses with users and feeds its interactions into             </span>
                <a 
                  href="https://www.brnrt.ai/about" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  brnrt.ai
                </a>
                <span className="bg-gradient-to-r from-orange-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {' '}as part of an ongoing research study.
                </span>
              </p>
              
              {/* Horizontal layout with robot, arc, and BRNRT */}
              <div className="flex items-center gap-0 relative">
                {/* Robot image */}
                <div className="relative">
                  <div className="absolute inset-0 w-full h-full bg-green-500/5 rounded-full blur-xl animate-pulse"></div>
                  <Image
                    src="/robot.png"
                    alt="AI Robot"
                    width={85}
                    height={85}
                    className="rounded-lg relative z-10"
                  />
                </div>
                
                {/* Dashed Arc Connection - Upside down U */}
                <svg width="200" height="120" viewBox="0 0 200 120" className="mx-0" style={{ marginTop: '-10px' }}>
                  <path
                    d="M 15 60 Q 100 10, 185 60"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="8,8"
                    strokeLinecap="round"
                    className="animated-arc"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* BRNRT Text with Gradient Animation */}
                <h1 className="text-4xl font-black tracking-tighter relative">
                  <span className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 bg-clip-text text-transparent animate-pulse">B</span>
                  <span className="bg-gradient-to-r from-red-500 via-purple-600 to-pink-500 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.2s' }}>R</span>
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-600 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.4s' }}>N</span>
                  <span className="bg-gradient-to-r from-pink-500 via-orange-600 to-red-500 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.6s' }}>R</span>
                  <span className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.8s' }}>T</span>
                  <div className="absolute inset-0 blur-2xl bg-orange-600/30 animate-pulse -z-10"></div>
                </h1>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg ${
                    message.role === 'user' 
                      ? (message.image ? '' : 'p-3')
                      : 'bg-black/50 p-3'
                  }`}>
                    {message.image && (
                      <img 
                        src={message.image} 
                        alt="Uploaded" 
                        className="rounded-lg max-w-full h-auto"
                        style={{ maxHeight: '150px', width: 'auto' }}
                      />
                    )}
                    {message.generatedImage && (
                      <div className="space-y-2">
                        <img 
                          src={message.generatedImage} 
                          alt="Generated" 
                          className="rounded-lg max-w-full h-auto mb-2"
                          style={{ maxHeight: '400px', width: 'auto' }}
                        />
                      </div>
                    )}
                    {message.content && (
                      <p className={`text-sm whitespace-pre-wrap ${
                        message.role === 'assistant' ? 'text-green-500 font-mono' : 'text-white'
                      }`}>
                        {message.content === 'Thinking' || message.content === 'Generating image' ? (
                          <span className="thinking-dots">{message.content}</span>
                        ) : (
                          message.content
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="px-8 py-4">
          <div ref={inputContainerRef} className="relative">
            {showSlashMenu && (
              <SlashCommandMenu 
                onSelectCommand={handleCommandSelect} 
                onImageUpload={handleImageUpload}
              />
            )}
            <button 
              onClick={() => setShowSlashMenu(!showSlashMenu)}
              disabled={currentChatOwner !== null && currentChatOwner !== walletAddress}
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center transition-colors z-10 ${
                currentChatOwner !== null && currentChatOwner !== walletAddress
                  ? 'opacity-30 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-zinc-700/50 hover:rounded-full'
              }`}
            >
              <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {isGenerateMode && (
              <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded text-blue-400 text-[11px] font-medium z-10">
                <ImageIcon size={12} />
                <span>Image</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGenerateMode(false);
                    setInputValue('');
                  }}
                  className="ml-0.5 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={currentChatOwner !== null && currentChatOwner !== walletAddress}
              placeholder={
                currentChatOwner !== null && currentChatOwner !== walletAddress
                  ? "Viewing another user's chat (read-only)"
                  : isGenerateMode 
                    ? "Describe the image you want to generate..." 
                    : "Enter your task or question..."
              }
              className={`w-full bg-zinc-900 text-white pr-12 py-1.5 rounded-lg focus:outline-none text-sm ${isGenerateMode ? 'pl-36' : 'pl-12'} ${currentChatOwner !== null && currentChatOwner !== walletAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={currentChatOwner !== null && currentChatOwner !== walletAddress}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors ${
                currentChatOwner !== null && currentChatOwner !== walletAddress
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:text-white cursor-pointer'
              }`}
            >
              <span className="text-xl">↵</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
