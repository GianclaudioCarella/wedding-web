'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tool_call_id?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function AdminChat() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [showSettings, setShowSettings] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemMessageEdit, setSystemMessageEdit] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isMemorySaveModalOpen, setIsMemorySaveModalOpen] = useState(false);
  const [memorySaveLoading, setMemorySaveLoading] = useState(false);
  const [currentConversationHasMemory, setCurrentConversationHasMemory] = useState(false);
  const [memorySaveResult, setMemorySaveResult] = useState<{
    success: boolean;
    message: string;
    summary?: string;
    importance?: number;
    topics?: string[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', icon: '🤖' },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/admin/login');
      return;
    }

    setIsAuthenticated(true);
    setUserId(user.id);
    
    // Check for stored token
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      setGithubToken(storedToken);
    } else {
      setIsTokenModalOpen(true);
    }
    
    // Load system message settings
    await loadSystemMessage();
    
    // Load conversations
    await loadConversations(user.id);
    
    setIsLoading(false);
  };

  const loadSystemMessage = async () => {
    const { data, error } = await supabase
      .from('chat_settings')
      .select('setting_value')
      .eq('setting_key', 'system_message')
      .single();

    if (error) {
      console.error('Error loading system message:', error);
      return;
    }

    if (data) {
      setSystemMessage(data.setting_value);
      setSystemMessageEdit(data.setting_value);
    }
  };

  const saveSystemMessage = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('chat_settings')
      .update({
        setting_value: systemMessageEdit,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('setting_key', 'system_message');

    if (error) {
      console.error('Error saving system message:', error);
      alert('Error saving settings');
      return;
    }

    setSystemMessage(systemMessageEdit);
    setIsEditingSettings(false);
    alert('Settings saved successfully!');
  };

  const loadConversations = async (uid: string) => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const loadConversation = async (conversationId: string) => {
    // Before loading new conversation, try to summarize the current one
    if (currentConversationId && currentConversationId !== conversationId && githubToken && userId) {
      console.log(`[Memory] Switching from conversation ${currentConversationId} to ${conversationId}`);
      try {
        const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
        const memoryService = new ConversationMemoryService(supabase, githubToken);
        
        // Check if current conversation should be summarized
        const shouldSummarize = await memoryService.shouldSummarizeConversation(currentConversationId);
        console.log(`[Memory] Should summarize ${currentConversationId}:`, shouldSummarize);
        
        if (shouldSummarize) {
          console.log(`[Memory] Generating summary for conversation ${currentConversationId}...`);
          // Generate summary in background (don't wait for it)
          memoryService.generateConversationSummary(currentConversationId, userId)
            .then(summary => console.log('[Memory] Summary generated:', summary))
            .catch(err => console.error('[Memory] Failed to generate summary:', err));
        }
      } catch (error) {
        console.error('[Memory] Error in summary generation:', error);
      }
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    const loadedMessages = data?.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: new Date(msg.created_at),
    })) || [];

    setMessages(loadedMessages);
    setCurrentConversationId(conversationId);

    // Check if this conversation already has a memory
    const { data: existingMemory } = await supabase
      .from('conversation_summaries')
      .select('id')
      .eq('conversation_id', conversationId)
      .single();
    
    setCurrentConversationHasMemory(!!existingMemory);
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!userId) return null;

    // Before creating new conversation, try to summarize the current one
    if (currentConversationId && githubToken) {
      console.log(`[Memory] Creating new conversation, checking if ${currentConversationId} should be summarized`);
      try {
        const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
        const memoryService = new ConversationMemoryService(supabase, githubToken);
        
        const shouldSummarize = await memoryService.shouldSummarizeConversation(currentConversationId);
        console.log(`[Memory] Should summarize ${currentConversationId}:`, shouldSummarize);
        
        if (shouldSummarize) {
          console.log(`[Memory] Generating summary for conversation ${currentConversationId}...`);
          // Generate summary in background
          memoryService.generateConversationSummary(currentConversationId, userId)
            .then(summary => console.log('[Memory] Summary generated:', summary))
            .catch(err => console.error('[Memory] Failed to generate summary:', err));
        }
      } catch (error) {
        console.error('[Memory] Error in summary generation:', error);
      }
    }

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title: title,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    setCurrentConversationId(data.id);
    if (userId) await loadConversations(userId);
    return data.id;
  };

  const handleGenerateSummary = async () => {
    if (!currentConversationId || !userId || !githubToken) {
      setMemorySaveResult({
        success: false,
        message: 'No active conversation to save'
      });
      setIsMemorySaveModalOpen(true);
      return;
    }

    // Check if conversation has enough messages (at least 2)
    if (messages.length < 2) {
      setMemorySaveResult({
        success: false,
        message: 'Add at least 2 messages before saving to memory'
      });
      setIsMemorySaveModalOpen(true);
      return;
    }

    // Open modal and show loading
    setIsMemorySaveModalOpen(true);
    setMemorySaveLoading(true);
    setMemorySaveResult(null);

    try {
      const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
      const memoryService = new ConversationMemoryService(supabase, githubToken);
      
      // Check if summary already exists
      const { data: existingSummary } = await supabase
        .from('conversation_summaries')
        .select('id')
        .eq('conversation_id', currentConversationId)
        .single();

      if (existingSummary) {
        setMemorySaveResult({
          success: false,
          message: 'This conversation is already saved in memory. View it in the Memories section.'
        });
        setMemorySaveLoading(false);
        return;
      }

      // Generate summary
      const summary = await memoryService.generateConversationSummary(currentConversationId, userId);
      
      if (summary) {
        setMemorySaveResult({
          success: true,
          message: 'Successfully saved to memory!',
          summary: summary.summary,
          importance: summary.importance_score,
          topics: summary.key_topics
        });
        setCurrentConversationHasMemory(true);
      }
    } catch (error) {
      console.error('Error saving to memory:', error);
      setMemorySaveResult({
        success: false,
        message: 'Failed to save: ' + (error as Error).message
      });
    } finally {
      setMemorySaveLoading(false);
    }
  };

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: role,
        content: content,
      });

    if (error) {
      console.error('Error saving message:', error);
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    setIsLoading(false);
  };

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('github_token', tokenInput.trim());
      setGithubToken(tokenInput.trim());
      setIsTokenModalOpen(false);
      setTokenInput('');
    }
  };

  // Database functions that the AI can call
  const getGuestStatistics = async () => {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*');
    
    if (error) throw error;

    const stats = {
      total_guests: guests?.length || 0,
      total_people: guests?.reduce((sum, g) => sum + (g.total_guests || 1), 0) || 0,
      confirmed: guests?.filter(g => g.attending === 'yes').length || 0,
      confirmed_people: guests?.filter(g => g.attending === 'yes').reduce((sum, g) => sum + (g.total_guests || 1), 0) || 0,
      declined: guests?.filter(g => g.attending === 'no').length || 0,
      maybe: guests?.filter(g => g.attending === 'perhaps').length || 0,
      no_response: guests?.filter(g => !g.attending).length || 0,
      invites_sent: guests?.filter(g => g.save_the_date_sent === true).length || 0,
      invites_pending: guests?.filter(g => g.save_the_date_sent !== true).length || 0,
    };

    return stats;
  };

  const listGuests = async (filter?: string) => {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('id, name, email, phone, language, total_guests, attending, save_the_date_sent')
      .order('name');
    
    if (error) throw error;

    let filtered = guests || [];
    if (filter === 'confirmed') filtered = filtered.filter(g => g.attending === 'yes');
    if (filter === 'declined') filtered = filtered.filter(g => g.attending === 'no');
    if (filter === 'maybe') filtered = filtered.filter(g => g.attending === 'perhaps');
    if (filter === 'no_response') filtered = filtered.filter(g => !g.attending);
    if (filter === 'sent') filtered = filtered.filter(g => g.save_the_date_sent === true);
    if (filter === 'pending') filtered = filtered.filter(g => g.save_the_date_sent !== true);

    return filtered;
  };

  const listEvents = async () => {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date');
    
    if (error) throw error;
    return events || [];
  };

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_guest_statistics',
        description: 'Get statistics about wedding guests including total count, confirmations, declines, and RSVP status',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_guests',
        description: 'List all guests or filter by status (confirmed, declined, maybe, no_response, sent, pending)',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              enum: ['confirmed', 'declined', 'maybe', 'no_response', 'sent', 'pending', 'all'],
              description: 'Filter guests by their status',
            },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_events',
        description: 'List all wedding events with their details',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
  ];

  const executeTool = async (toolName: string, args: any) => {
    switch (toolName) {
      case 'get_guest_statistics':
        return await getGuestStatistics();
      case 'list_guests':
        return await listGuests(args.filter);
      case 'list_events':
        return await listEvents();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || !githubToken) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    const messageContent = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      // Create new conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        convId = await createNewConversation(messageContent);
        if (!convId) throw new Error('Failed to create conversation');
      }

      // Save user message
      await saveMessage(convId, 'user', messageContent);

      // Step 1: Get conversation memories from past chats
      let conversationMemories = '';
      if (userId) {
        try {
          const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
          const memoryService = new ConversationMemoryService(supabase, githubToken);
          
          // Get recent summaries (exclude current conversation)
          const summaries = await memoryService.getRecentSummaries(userId, 3, 4);
          if (summaries.length > 0) {
            conversationMemories = memoryService.formatMemoryContext(summaries);
          }
        } catch (error) {
          console.log('Failed to load conversation memories:', error);
        }
      }

      // Step 2: Search for relevant documents using RAG
      let relevantContext = '';
      try {
        const { EmbeddingService } = await import('@/lib/services/embedding.service');
        const { VectorSearchService } = await import('@/lib/services/vector-search.service');
        
        const embeddingService = new EmbeddingService(githubToken);
        const vectorSearchService = new VectorSearchService(supabase, embeddingService);
        
        // Get relevant context from documents
        relevantContext = await vectorSearchService.getRelevantContext(messageContent, {
          limit: 3,
          similarityThreshold: 0.6,
        });
      } catch (error) {
        console.log('No documents available or search failed:', error);
        // Continue without document context
      }

      // Step 3: Build conversation messages with all context
      let systemMessageWithContext = systemMessage || 'You are a helpful AI assistant for wedding planning. You have access to tools to query the wedding database. Use these tools to provide accurate, up-to-date information about guests, events, and statistics. Always use the tools when asked about specific data.';
      
      // Prepend conversation memories if available
      if (conversationMemories) {
        systemMessageWithContext = conversationMemories + '\n\n' + systemMessageWithContext;
      }
      
      // Append document context if available
      if (relevantContext && !relevantContext.includes('No relevant documents found')) {
        systemMessageWithContext += '\n\n' + relevantContext;
      }

      const conversationMessages: Array<{
        role: string;
        content: string;
        tool_call_id?: string;
        tool_calls?: any;
      }> = [
        {
          role: 'system',
          content: systemMessageWithContext,
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: inputMessage },
      ];

      let response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          messages: conversationMessages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 2000,
          tools: tools,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get response');
      }

      let data = await response.json();
      let assistantMessage = data.choices[0].message;

      // Handle tool calls
      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversationMessages.push(assistantMessage);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          try {
            const toolResult = await executeTool(toolName, toolArgs);
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          } catch (error: any) {
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message }),
            });
          }
        }

        // Get final response from model
        response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${githubToken}`,
          },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 2000,
            tools: tools,
            tool_choice: 'auto',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to get response');
        }

        data = await response.json();
        assistantMessage = data.choices[0].message;
      }

      const finalMessage: Message = {
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, finalMessage]);
      
      // Save assistant message
      if (convId) {
        await saveMessage(convId, 'assistant', assistantMessage.content);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}. Please check your GitHub token and try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    if (currentConversationId === conversationId) {
      clearChat();
    }

    if (userId) await loadConversations(userId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => router.push('/admin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Admin</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={clearChat}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-left mb-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
            
            <div className="space-y-2 mb-6">
              <p className="text-xs uppercase text-gray-400 px-2 mb-2">Conversations</p>
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-500 px-2">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} className="group relative">
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        currentConversationId === conv.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="truncate flex-1">{conv.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded transition-all"
                      title="Delete conversation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-xs uppercase text-gray-400 px-2 mb-2">Model</p>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedModel === model.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{model.icon}</span>
                  <span>{model.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-800 space-y-2">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="text-sm">Token</span>
            </button>
            <button
              onClick={() => {
                setSystemMessageEdit(systemMessage);
                setIsEditingSettings(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">Memory Settings</span>
            </button>
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Documents</span>
            </button>
            <button
              onClick={() => setIsMemoryModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm">Memories</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-xl">{models.find(m => m.id === selectedModel)?.icon || '🤖'}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {models.find(m => m.id === selectedModel)?.name || 'AI Assistant'}
                    </h2>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
                {currentConversationId && (
                  <button
                    onClick={handleGenerateSummary}
                    className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                      currentConversationHasMemory 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                    title={currentConversationHasMemory 
                      ? 'This conversation is already saved in memory' 
                      : 'Save this conversation to long-term memory'
                    }
                  >
                    {currentConversationHasMemory ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                    Remember It
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you today?</h3>
                  <p className="text-gray-500">Ask me anything about wedding planning, guest management, or events.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto">
                    <button
                      onClick={() => setInputMessage("How many guests have confirmed their attendance?")}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">Check RSVP Status</p>
                      <p className="text-xs text-gray-500 mt-1">View confirmation statistics</p>
                    </button>
                    <button
                      onClick={() => setInputMessage("Help me draft an email to send to guests who haven't responded")}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">Draft Follow-up Email</p>
                      <p className="text-xs text-gray-500 mt-1">Compose reminder message</p>
                    </button>
                    <button
                      onClick={() => setInputMessage("What are some creative ideas for wedding decorations?")}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">Get Decoration Ideas</p>
                      <p className="text-xs text-gray-500 mt-1">Explore creative options</p>
                    </button>
                    <button
                      onClick={() => setInputMessage("Help me organize the seating arrangement")}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">Plan Seating</p>
                      <p className="text-xs text-gray-500 mt-1">Organize guest placement</p>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">{models.find(m => m.id === selectedModel)?.icon || '🤖'}</span>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gray-900 text-white ml-12'
                          : 'bg-white border border-gray-200 mr-12 text-black'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black prose-code:text-black prose-pre:bg-gray-100 prose-pre:text-black">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 px-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{models.find(m => m.id === selectedModel)?.icon || '🤖'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mr-12">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-3xl mx-auto px-4 py-4">
              {!githubToken && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    ⚠️ Please configure your GitHub token in Settings to start chatting
                  </p>
                </div>
              )}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white placeholder-gray-400 [color:black] disabled:opacity-50"
                    rows={1}
                    disabled={isSending || !githubToken}
                    style={{ minHeight: '52px', maxHeight: '200px', color: 'black !important' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !inputMessage.trim() || !githubToken}
                  className="w-12 h-12 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-lg hover:shadow-xl"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Configuration Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Configure GitHub Token</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Create a token at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    github.com/settings/tokens
                  </a>
                  {' '}with &quot;models&quot; scope
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveToken}
                  disabled={!tokenInput.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save Token
                </button>
                {githubToken && (
                  <button
                    onClick={() => {
                      setIsTokenModalOpen(false);
                      setTokenInput('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isEditingSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Memory Settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure the global memory that will be shared across all conversations and all admin users.
                This helps the AI remember important wedding details.
              </p>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Message (Global Memory)
                </label>
                <textarea
                  value={systemMessageEdit}
                  onChange={(e) => setSystemMessageEdit(e.target.value)}
                  placeholder="Enter wedding details and information that the AI should remember..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Include information like: bride and groom names, wedding date, venue, important contacts, 
                  special instructions, etc. This will be included in every conversation as context for the AI.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={async () => {
                  await saveSystemMessage();
                  setIsEditingSettings(false);
                }}
                disabled={!systemMessageEdit.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Memory
              </button>
              <button
                onClick={() => {
                  setSystemMessageEdit(systemMessage);
                  setIsEditingSettings(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {isDocumentModalOpen && userId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Knowledge Base Documents</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload documents to enhance the AI's knowledge. The AI will search these documents to answer questions.
                </p>
              </div>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Lazy load DocumentUpload component */}
              {githubToken && (
                <DocumentUploadWrapper 
                  githubToken={githubToken} 
                  userId={userId}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Memories Modal */}
      {isMemoryModalOpen && userId && githubToken && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Conversation Memories</h2>
                <p className="text-sm text-gray-600 mt-1">
                  AI-generated summaries of your past conversations. These help maintain context across chats.
                </p>
              </div>
              <button
                onClick={() => setIsMemoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <ConversationMemoriesView 
                supabase={supabase}
                githubToken={githubToken}
                userId={userId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Memory Save Modal */}
      <MemorySaveModal
        isOpen={isMemorySaveModalOpen}
        onClose={() => {
          setIsMemorySaveModalOpen(false);
          setMemorySaveResult(null);
        }}
        loading={memorySaveLoading}
        result={memorySaveResult}
      />
    </div>
  );
}

/**
 * Component to display conversation memories
 */
function ConversationMemoriesView({ 
  supabase, 
  githubToken, 
  userId 
}: { 
  supabase: any; 
  githubToken: string; 
  userId: string;
}) {
  const [memories, setMemories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<{ id: string; summary: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
      const memoryService = new ConversationMemoryService(supabase, githubToken);
      
      const [summaries, statistics] = await Promise.all([
        memoryService.getRecentSummaries(userId, 10, 1),
        memoryService.getSummaryStats(userId),
      ]);
      
      setMemories(summaries);
      setStats(statistics);
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (memoryId: string, summary: string) => {
    setMemoryToDelete({ id: memoryId, summary });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memoryToDelete) return;

    setIsDeleting(true);
    try {
      const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
      const memoryService = new ConversationMemoryService(supabase, githubToken);
      await memoryService.deleteSummary(memoryToDelete.id);
      await loadMemories();
      setDeleteConfirmOpen(false);
      setMemoryToDelete(null);
    } catch (error) {
      console.error('Error deleting memory:', error);
      alert('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">Loading memories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Memory Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-600 font-medium">{stats.totalSummaries}</p>
              <p className="text-blue-700">Conversations</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">{stats.totalMessages}</p>
              <p className="text-blue-700">Messages</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">{stats.averageImportance}/10</p>
              <p className="text-blue-700">Avg Importance</p>
            </div>
          </div>
        </div>
      )}

      {/* Memories List */}
      {memories.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>No conversation memories yet.</p>
          <p className="text-sm mt-2">Have at least 4 messages in a conversation, then switch to a new one to create a summary.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(memory.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      Importance: {memory.importance_score}/10
                    </span>
                    <span className="text-xs text-gray-500">
                      {memory.message_count} messages
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{memory.summary}</p>
                  {memory.key_topics && memory.key_topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memory.key_topics.map((topic: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteClick(memory.id, memory.summary)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete memory"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && memoryToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Delete Memory?
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Are you sure you want to delete this memory? This action cannot be undone.
                  </p>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {memoryToDelete.summary}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setMemoryToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memory Save Modal Component
 */
function MemorySaveModal({ 
  isOpen, 
  onClose, 
  loading, 
  result 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  loading: boolean;
  result: {
    success: boolean;
    message: string;
    summary?: string;
    importance?: number;
    topics?: string[];
  } | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Saving to Memory...' : result?.success ? 'Saved Successfully!' : 'Unable to Save'}
            </h2>
            {!loading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
              <p className="text-gray-600 text-center">
                Analyzing conversation and generating memory...
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="h-8 w-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-800 font-medium">{result.message}</p>
                  </div>

                  {result.importance !== undefined && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">Importance Score:</span>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">
                          {result.importance}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        This score helps prioritize which memories to recall in future conversations.
                      </p>
                    </div>
                  )}

                  {result.topics && result.topics.length > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Key Topics:</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.topics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.summary && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Memory Summary:</h3>
                      <p className="text-gray-700 leading-relaxed">{result.summary}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={onClose}
                      className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <svg className="h-8 w-8 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-800">{result.message}</p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={onClose}
                      className="w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component to lazy load DocumentUpload
 */
function DocumentUploadWrapper({ githubToken, userId }: { githubToken: string; userId: string }) {
  const [DocumentUpload, setDocumentUpload] = useState<any>(null);

  useEffect(() => {
    import('./components/DocumentUpload').then((mod) => {
      setDocumentUpload(() => mod.default);
    });
  }, []);

  if (!DocumentUpload) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  return <DocumentUpload githubToken={githubToken} userId={userId} />;
}
