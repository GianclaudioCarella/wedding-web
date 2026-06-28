'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Conversation, MemorySaveResult, Model } from './types';
import { MODELS, TOOLS } from './constants';
import { UserSettingsService } from './services/user-settings.service';
import { ChatSupabaseService } from './services/supabase.service';
import { SearchWebTool } from './tools/search-web.tool';
import { GuestTools } from './tools/guest.tools';
import { EventTools } from './tools/event.tools';
import { DocumentTools } from './tools/document.tools';
import { MemoryTools } from './tools/memory.tools';
import { WeddingTools } from './tools/wedding.tools';
import { LLMService } from './services/llm.service';

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
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tavilyKeyInput, setTavilyKeyInput] = useState('');
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [systemMessage, setSystemMessage] = useState('');
  const [systemMessageEdit, setSystemMessageEdit] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isMemorySaveModalOpen, setIsMemorySaveModalOpen] = useState(false);
  const [memorySaveLoading, setMemorySaveLoading] = useState(false);
  const [currentConversationHasMemory, setCurrentConversationHasMemory] = useState(false);
  const [memorySaveResult, setMemorySaveResult] = useState<MemorySaveResult | null>(null);
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const userSettingsService = new UserSettingsService(supabase);
  const chatService = new ChatSupabaseService(supabase);
  const guestTools = new GuestTools(supabase);
  const eventTools = new EventTools(supabase);
  const memoryTools = new MemoryTools(supabase);
  const weddingTools = new WeddingTools(supabase);
  const [documentTools, setDocumentTools] = useState<DocumentTools | null>(null);

  useEffect(() => {
    const getAuthToken = async () => { const { data: s } = await supabase.auth.getSession(); return s.session?.access_token ?? null; };
    setDocumentTools(new DocumentTools(supabase, getAuthToken));
  }, []);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }
    setIsAuthenticated(true);
    setUserId(user.id);
    await loadUserSettings(user.id);
    await loadSystemMessage();
    await loadConversations(user.id);
    setIsLoading(false);
  };

  const loadSystemMessage = async () => {
    const message = await chatService.loadSystemMessage();
    setSystemMessage(message);
    setSystemMessageEdit(message);
  };

  const loadUserSettings = async (uid: string) => {
    const data = await userSettingsService.loadUserSettings(uid);
    if (data) {
      if (data.github_token) setGithubToken(data.github_token);
      else setIsTokenModalOpen(true);
      if (data.tavily_api_key)    setTavilyApiKey(data.tavily_api_key);
      if (data.anthropic_api_key) setAnthropicKey(data.anthropic_api_key);
    } else {
      setIsTokenModalOpen(true);
    }
  };

  const saveSystemMessage = async () => {
    if (!userId) return;
    const result = await chatService.saveSystemMessage(userId, systemMessageEdit);
    if (result.success) {
      setSystemMessage(systemMessageEdit);
      setIsEditingSettings(false);
    } else {
      console.error('Error saving system message:', result.error);
    }
  };

  const loadConversations = async (uid: string) => {
    const data = await chatService.loadConversations(uid);
    setConversations(data);
  };

  const loadConversation = async (conversationId: string) => {
    if (currentConversationId && currentConversationId !== conversationId && githubToken && userId) {
      try {
        const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
        const memoryService = new ConversationMemoryService(supabase, githubToken);
        const shouldSummarize = await memoryService.shouldSummarizeConversation(currentConversationId);
        if (shouldSummarize) {
          memoryService.generateConversationSummary(currentConversationId, userId)
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

    if (error) { console.error('Error loading conversation:', error); return; }

    setMessages((data || []).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: new Date(msg.created_at),
    })));
    setCurrentConversationId(conversationId);

    const { data: existingMemory } = await supabase
      .from('conversation_summaries')
      .select('id')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    setCurrentConversationHasMemory(!!existingMemory);
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!userId) return null;
    if (currentConversationId && githubToken) {
      try {
        const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
        const memoryService = new ConversationMemoryService(supabase, githubToken);
        const shouldSummarize = await memoryService.shouldSummarizeConversation(currentConversationId);
        if (shouldSummarize) {
          memoryService.generateConversationSummary(currentConversationId, userId)
            .catch(err => console.error('[Memory] Failed to generate summary:', err));
        }
      } catch (error) {
        console.error('[Memory] Error in summary generation:', error);
      }
    }

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) { console.error('Error creating conversation:', error); return null; }
    setCurrentConversationId(data.id);
    if (userId) await loadConversations(userId);
    return data.id;
  };

  const handleGenerateSummary = async () => {
    if (!currentConversationId || !userId || !githubToken) {
      setMemorySaveResult({ success: false, message: 'No active conversation to save' });
      setIsMemorySaveModalOpen(true);
      return;
    }
    if (messages.length < 2) {
      setMemorySaveResult({ success: false, message: 'Add at least 2 messages before saving to memory' });
      setIsMemorySaveModalOpen(true);
      return;
    }
    setIsMemorySaveModalOpen(true);
    setMemorySaveLoading(true);
    setMemorySaveResult(null);
    try {
      const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
      const memoryService = new ConversationMemoryService(supabase, githubToken);
      const { data: existingSummary } = await supabase
        .from('conversation_summaries')
        .select('id')
        .eq('conversation_id', currentConversationId)
        .maybeSingle();
      if (existingSummary) {
        setMemorySaveResult({ success: false, message: 'This conversation is already saved in memory.' });
        setMemorySaveLoading(false);
        return;
      }
      const summary = await memoryService.generateConversationSummary(currentConversationId, userId);
      if (summary) {
        setMemorySaveResult({ success: true, message: 'Successfully saved to memory!', summary: summary.summary, importance: summary.importance_score, topics: summary.key_topics });
        setCurrentConversationHasMemory(true);
      }
    } catch (error) {
      setMemorySaveResult({ success: false, message: 'Failed to save: ' + (error as Error).message });
    } finally {
      setMemorySaveLoading(false);
    }
  };

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    await chatService.saveMessage(conversationId, role, content);
  };

  const handleSaveToken = async () => {
    if (!userId) return;
    const newGithubToken    = tokenInput.trim()      || undefined;
    const newTavilyKey      = tavilyKeyInput.trim()  || undefined;
    const newAnthropicKey   = anthropicKeyInput.trim() || undefined;
    if (!newGithubToken && !newTavilyKey && !newAnthropicKey) return;
    const result = await userSettingsService.saveUserSettings(userId, newGithubToken, newTavilyKey, newAnthropicKey);
    if (result.success) {
      if (tokenInput.trim())       { setGithubToken(tokenInput.trim());         setTokenInput(''); }
      if (tavilyKeyInput.trim())   { setTavilyApiKey(tavilyKeyInput.trim());    setTavilyKeyInput(''); }
      if (anthropicKeyInput.trim()) { setAnthropicKey(anthropicKeyInput.trim()); setAnthropicKeyInput(''); }
      setIsTokenModalOpen(false);
    } else {
      console.error('Error saving API keys:', result.error);
    }
  };

  const executeTool = async (toolName: string, args: any) => {
    const searchWebTool = new SearchWebTool(supabase, tavilyApiKey);
    switch (toolName) {
      case 'search_memories':
        if (!userId) return 'Cannot search memories: user not authenticated.';
        return await memoryTools.searchMemories(args.query, userId);
      case 'search_documents':
        if (!documentTools) return 'Document search is not available. Please ensure your GitHub token is configured.';
        return await documentTools.searchDocuments(args.query);
      case 'search_web':
        return await searchWebTool.execute(args.query);
      case 'get_guest_statistics':
        return await guestTools.getGuestStatistics();
      case 'list_guests':
        return await guestTools.listGuests(args.filter);
      case 'list_events':
        return await eventTools.listEvents();
      case 'get_transport_overview':
        return await weddingTools.getTransportOverview();
      case 'get_accommodation_overview':
        return await weddingTools.getAccommodationOverview();
      case 'get_planning_tasks':
        return await weddingTools.getPlanningTasks(args.filter || 'all');
      case 'get_communications_history':
        return await weddingTools.getCommunicationsHistory();
      case 'get_rsvp_details':
        return await weddingTools.getRsvpDetails();
      case 'get_guest_email_status':
        return await weddingTools.getGuestEmailStatus();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };

  const handleSendMessage = async () => {
    const isAnthropicModel = selectedModel.startsWith('claude-');
    if (!inputMessage.trim() || isSending) return;
    if (isAnthropicModel && !anthropicKey) return;
    if (!isAnthropicModel && !githubToken) return;

    const userMessage: Message = { role: 'user', content: inputMessage, timestamp: new Date() };
    const messageContent = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      let convId = currentConversationId;
      if (!convId) {
        convId = await createNewConversation(messageContent);
        if (!convId) throw new Error('Failed to create conversation');
      }
      await saveMessage(convId, 'user', messageContent);

      let conversationMemories = '';
      if (userId) {
        try {
          const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
          const memoryService = new ConversationMemoryService(supabase, githubToken);
          const summaries = await memoryService.getRecentSummaries(userId, 3, 4);
          if (summaries.length > 0) conversationMemories = memoryService.formatMemoryContext(summaries);
        } catch {}
      }

      let relevantContext = '';
      try {
        const { data: docCheck } = await supabase
          .from('documents').select('id').eq('status', 'completed').limit(1);
        if (docCheck && docCheck.length > 0) {
          const { EmbeddingService } = await import('@/lib/services/embedding.service');
          const { VectorSearchService } = await import('@/lib/services/vector-search.service');
          const getAuthToken = async () => { const { data: s } = await supabase.auth.getSession(); return s.session?.access_token ?? null; };
          const embeddingService = new EmbeddingService(getAuthToken);
          const vectorSearchService = new VectorSearchService(supabase, embeddingService);
          relevantContext = await vectorSearchService.getRelevantContext(messageContent, { limit: 3, similarityThreshold: 0.6 });
        }
      } catch {}

      const defaultSystemMessage = [
        'You are a helpful AI assistant for wedding planning. You have access to the following tools:',
        '',
        '**Guest & RSVP:**',
        '- **get_guest_statistics**: Overall guest counts and RSVP summary',
        '- **list_guests**: List guests filtered by status',
        '- **get_rsvp_details**: Detailed RSVP per event including dietary requirements',
        '- **get_guest_email_status**: Per-guest email status — who has an email, who received the save the date, who has not yet',
        '',
        '**Events & Logistics:**',
        '- **list_events**: All wedding events with details',
        '- **get_transport_overview**: Transport options and which guests are assigned to each',
        '- **get_accommodation_overview**: Venue room assignments, stay requests by night, and external hotels',
        '',
        '**Planning & Communications:**',
        '- **get_planning_tasks**: Wedding planning task list, filterable by status',
        '- **get_communications_history**: History of email campaigns sent to guests',
        '',
        '**Knowledge & Search:**',
        '- **search_memories**: Search saved conversation memories from previous discussions',
        '- **search_documents**: Search uploaded wedding documents (PDFs, contracts, etc.)',
        '- **search_web**: Search the internet for current information',
        '',
        'IMPORTANT: Always use the appropriate tool to fetch live data before answering. When asked about past discussions or decisions, use search_memories. When asked about costs or vendor details, use search_documents FIRST.',
      ].join('\n');
      let systemMessageWithContext = systemMessage || defaultSystemMessage;
      if (conversationMemories) systemMessageWithContext = conversationMemories + '\n\n' + systemMessageWithContext;
      if (relevantContext && !relevantContext.includes('No relevant documents found')) systemMessageWithContext += '\n\n' + relevantContext;

      const conversationMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: any }> = [
        { role: 'system', content: systemMessageWithContext },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: inputMessage },
      ];

      const llmService = new LLMService(
        githubToken,
        anthropicKey,
        async () => { const { data: s } = await supabase.auth.getSession(); return s.session?.access_token ?? null; },
      );
      let data = await llmService.chatCompletion({ messages: conversationMessages, model: selectedModel, temperature: 0.7, max_tokens: 2000, tools: TOOLS, tool_choice: 'auto' });
      let assistantMessage = data.choices[0].message;

      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversationMessages.push(assistantMessage);
        for (const toolCall of assistantMessage.tool_calls) {
          try {
            const toolResult = await executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'));
            conversationMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
          } catch (error: any) {
            conversationMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ error: error.message }) });
          }
        }
        data = await llmService.chatCompletion({ messages: conversationMessages, model: selectedModel, temperature: 0.7, max_tokens: 2000, tools: TOOLS, tool_choice: 'auto' });
        assistantMessage = data.choices[0].message;
      }

      const finalMessage: Message = { role: 'assistant', content: assistantMessage.content, timestamp: new Date() };
      setMessages(prev => [...prev, finalMessage]);
      if (convId) await saveMessage(convId, 'assistant', assistantMessage.content);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.message, timestamp: new Date() }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const clearChat = () => { setMessages([]); setCurrentConversationId(null); };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId);
    if (error) { console.error('Error deleting conversation:', error); return; }
    if (currentConversationId === conversationId) clearChat();
    if (userId) await loadConversations(userId);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentModel = MODELS.find((m: Model) => m.id === selectedModel);

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Left panel: conversations + model ── */}
      <div style={{ width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>

        {/* New chat */}
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={clearChat}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
            New Chat
          </button>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', padding: '4px 8px 6px', margin: 0 }}>Conversations</p>
          {conversations.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af', padding: '4px 8px' }}>No conversations yet</p>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredConvId(conv.id)}
              onMouseLeave={() => { setHoveredConvId(null); setConfirmDeleteId(null); }}
            >
              <button
                onClick={() => loadConversation(conv.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 28px 7px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12,
                  background: currentConversationId === conv.id ? '#111827' : hoveredConvId === conv.id ? '#f3f4f6' : 'transparent',
                  color: currentConversationId === conv.id ? '#fff' : '#4b5563',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M14 10.5a1 1 0 0 1-1 1H5l-3 3V2.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8z"/></svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.title}</span>
              </button>
              {confirmDeleteId === conv.id ? (
                <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); deleteConversation(conv.id); }}
                    title="Confirm delete"
                    style={{ border: 'none', background: '#ef4444', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, color: '#fff', fontSize: 10, fontWeight: 600 }}
                  >Delete</button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    title="Cancel"
                    style={{ border: 'none', background: '#e5e7eb', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, color: '#374151', fontSize: 10, fontWeight: 600 }}
                  >Cancel</button>
                </div>
              ) : hoveredConvId === conv.id && (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDeleteId(conv.id); }}
                  title="Delete conversation"
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: '3px', borderRadius: 3, color: '#9ca3af', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { (e.currentTarget.style.color = '#ef4444'); (e.currentTarget.style.background = '#fee2e2'); }}
                  onMouseLeave={e => { (e.currentTarget.style.color = '#9ca3af'); (e.currentTarget.style.background = 'none'); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Model selector */}
        <div style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', padding: '4px 8px 6px', margin: 0 }}>Model</p>
          {MODELS.map((model: Model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12,
                background: selectedModel === model.id ? '#111827' : 'transparent',
                color: selectedModel === model.id ? '#fff' : '#4b5563',
              }}
              onMouseEnter={e => { if (selectedModel !== model.id) (e.currentTarget.style.background = '#f3f4f6'); }}
              onMouseLeave={e => { if (selectedModel !== model.id) (e.currentTarget.style.background = 'transparent'); }}
            >
              <span style={{ fontSize: 14 }}>{model.icon}</span>
              <span style={{ fontWeight: 500 }}>{model.name}</span>
              {selectedModel === model.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Bottom action buttons */}
        <div style={{ padding: '8px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'API Keys', onClick: () => setIsTokenModalOpen(true) },
            { label: 'Memory Settings', onClick: () => { setSystemMessageEdit(systemMessage); setIsEditingSettings(true); } },
            { label: 'Documents', onClick: () => setIsDocumentModalOpen(true) },
            { label: 'Memories', onClick: () => setIsMemoryModalOpen(true) },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{ width: '100%', padding: '7px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: '#6b7280', borderRadius: 5 }}
              onMouseEnter={e => { (e.currentTarget.style.background = '#f3f4f6'); (e.currentTarget.style.color = '#111827'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'none'); (e.currentTarget.style.color = '#6b7280'); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb', minWidth: 0 }}>

        {/* Chat header */}
        <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>{currentModel?.icon || '🤖'}</span>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{currentModel?.name || 'AI Assistant'}</p>
              {currentModel?.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{currentModel.description}</p>}
            </div>
          </div>
          {currentConversationId && (
            <button
              onClick={handleGenerateSummary}
              title={currentConversationHasMemory ? 'Already saved to memory' : 'Save to long-term memory'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#fff',
                background: currentConversationHasMemory ? '#16a34a' : '#7c3aed',
              }}
            >
              {currentConversationHasMemory ? '★' : '☆'} Remember It
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', minHeight: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>How can I help you today?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Ask me anything about wedding planning, guests, or events.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, margin: '0 auto' }}>
                  {[
                    { title: 'Check RSVP Status', desc: 'View confirmation statistics', msg: "How many guests have confirmed their attendance?" },
                    { title: 'Draft Follow-up Email', desc: 'Compose reminder message', msg: "Help me draft an email to send to guests who haven't responded" },
                    { title: 'Get Decoration Ideas', desc: 'Explore creative options', msg: "What are some creative ideas for wedding decorations?" },
                    { title: 'Plan Seating', desc: 'Organize guest placement', msg: "Help me organize the seating arrangement" },
                  ].map(({ title, desc, msg }) => (
                    <button
                      key={title}
                      onClick={() => setInputMessage(msg)}
                      style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => { (e.currentTarget.style.borderColor = '#6b7280'); }}
                      onMouseLeave={e => { (e.currentTarget.style.borderColor = '#e5e7eb'); }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: '0 0 3px' }}>{title}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((message, index) => (
                <div key={index} style={{ display: 'flex', gap: 12, flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}>
                  {message.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12 }}>{currentModel?.icon || '🤖'}</span>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.65,
                      ...(message.role === 'user'
                        ? { background: '#111827', color: '#fff', marginLeft: 48 }
                        : { background: '#fff', border: '1px solid #e5e7eb', color: '#111827', marginRight: 48 }
                      ),
                    }}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900 prose-a:text-blue-600">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" /> }}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', paddingLeft: 4 }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12 }}>{currentModel?.icon || '🤖'}</span>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', marginRight: 48 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 150, 300].map(delay => (
                        <div key={delay} style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', animation: 'bounce 1s infinite', animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {(() => {
              const needsAnthropicKey = selectedModel.startsWith('claude-') && !anthropicKey;
              const needsGithubToken  = !selectedModel.startsWith('claude-') && !githubToken;
              if (needsAnthropicKey || needsGithubToken) return (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                  <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>
                    {needsAnthropicKey ? 'Configure your Anthropic API key to use Claude models.' : 'Configure your GitHub token to start chatting.'}
                  </p>
                </div>
              );
              return null;
            })()}
            {(() => {
              const isAnthropicModel = selectedModel.startsWith('claude-');
              const blocked = isSending || (isAnthropicModel ? !anthropicKey : !githubToken);
              const canSend = !blocked && !!inputMessage.trim();
              return (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message…"
                disabled={blocked}
                rows={1}
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, outline: 'none', fontSize: 13, color: '#111827', background: '#fff', resize: 'none', minHeight: 42, maxHeight: 200, lineHeight: 1.5, fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#6b7280')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button
                onClick={handleSendMessage}
                disabled={!canSend}
                style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed', background: canSend ? '#111827' : '#e5e7eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {isSending
                  ? <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                }
              </button>
            </div>
              );
            })()}
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      {/* ── Token modal ── */}
      {isTokenModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: '100%', maxWidth: 440, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Configure API Keys</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>GitHub Personal Access Token</label>
                <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="ghp_…" style={inputStyle} />
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Token with "models" scope from <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>github.com/settings/tokens</a></p>
              </div>
              <div>
                <label style={labelStyle}>Anthropic API Key <span style={{ fontWeight: 400, color: '#9ca3af' }}>(for Claude models)</span></label>
                <input type="password" value={anthropicKeyInput} onChange={e => setAnthropicKeyInput(e.target.value)} placeholder="sk-ant-…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tavily API Key <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — web search)</span></label>
                <input type="password" value={tavilyKeyInput} onChange={e => setTavilyKeyInput(e.target.value)} placeholder="tvly-…" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleSaveToken} disabled={!tokenInput.trim() && !tavilyKeyInput.trim() && !anthropicKeyInput.trim()} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#111827', color: '#fff' }}>
                  Save Keys
                </button>
                {githubToken && (
                  <button onClick={() => { setIsTokenModalOpen(false); setTokenInput(''); setTavilyKeyInput(''); setAnthropicKeyInput(''); }} style={{ flex: 1, padding: '9px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: '#fff', color: '#374151' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Memory settings modal ── */}
      {isEditingSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Memory Settings</h2>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Global memory shared across all conversations. Helps the AI remember important wedding details.</p>
            </div>
            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
              <label style={labelStyle}>System Message (Global Memory)</label>
              <textarea
                value={systemMessageEdit}
                onChange={e => setSystemMessageEdit(e.target.value)}
                placeholder="Enter wedding details and information…"
                rows={12}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6, padding: '10px 12px' }}
              />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
              <button onClick={saveSystemMessage} disabled={!systemMessageEdit.trim()} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#111827', color: '#fff' }}>Save Memory</button>
              <button onClick={() => { setSystemMessageEdit(systemMessage); setIsEditingSettings(false); }} style={{ flex: 1, padding: '9px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: '#fff', color: '#374151' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Documents modal ── */}
      {isDocumentModalOpen && userId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Knowledge Base Documents</h2>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Upload documents to enhance the AI's knowledge.</p>
              </div>
              <button onClick={() => setIsDocumentModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
              </button>
            </div>
            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
              {userId && <DocumentUploadWrapper userId={userId} />}
            </div>
          </div>
        </div>
      )}

      {/* ── Memories modal ── */}
      {isMemoryModalOpen && userId && githubToken && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Conversation Memories</h2>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>AI-generated summaries of past conversations.</p>
              </div>
              <button onClick={() => setIsMemoryModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
              </button>
            </div>
            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
              <ConversationMemoriesView supabase={supabase} githubToken={githubToken} userId={userId} />
            </div>
          </div>
        </div>
      )}

      {/* ── Memory save modal ── */}
      <MemorySaveModal
        isOpen={isMemorySaveModalOpen}
        onClose={() => { setIsMemorySaveModalOpen(false); setMemorySaveResult(null); }}
        loading={memorySaveLoading}
        result={memorySaveResult}
      />
    </div>
  );
}

/* ── Shared styles ── */

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: '#6b7280', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6,
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
};

/* ── ConversationMemoriesView ── */

function ConversationMemoriesView({ supabase, githubToken, userId }: { supabase: any; githubToken: string; userId: string }) {
  const [memories, setMemories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memoryToDelete, setMemoryToDelete] = useState<{ id: string; summary: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadMemories(); }, []);

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

  const handleDeleteConfirm = async () => {
    if (!memoryToDelete) return;
    setIsDeleting(true);
    try {
      const { ConversationMemoryService } = await import('@/lib/services/conversation-memory.service');
      const memoryService = new ConversationMemoryService(supabase, githubToken);
      await memoryService.deleteSummary(memoryToDelete.id);
      await loadMemories();
      setMemoryToDelete(null);
    } catch (error) {
      console.error('Error deleting memory:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading memories…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stats && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 10px' }}>Statistics</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { value: stats.totalSummaries, label: 'Conversations' },
              { value: stats.totalMessages, label: 'Messages' },
              { value: `${stats.averageImportance}/10`, label: 'Avg Importance' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{value}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {memories.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '32px 0' }}>No conversation memories yet.</p>
      ) : memories.map(memory => (
        <div key={memory.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{new Date(memory.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span style={{ fontSize: 11, padding: '1px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 4 }}>Importance: {memory.importance_score}/10</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{memory.message_count} messages</span>
              </div>
              <p style={{ fontSize: 13, color: '#111827', margin: '0 0 8px', lineHeight: 1.5 }}>{memory.summary}</p>
              {memory.key_topics?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {memory.key_topics.map((topic: string, idx: number) => (
                    <span key={idx} style={{ fontSize: 11, padding: '2px 7px', background: '#f3f4f6', color: '#6b7280', borderRadius: 4 }}>{topic}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setMemoryToDelete({ id: memory.id, summary: memory.summary })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"/></svg>
            </button>
          </div>
        </div>
      ))}

      {memoryToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 440, width: '100%', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>Delete Memory?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>This action cannot be undone.</p>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{memoryToDelete.summary}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setMemoryToDelete(null)} disabled={isDeleting} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MemorySaveModal ── */

function MemorySaveModal({ isOpen, onClose, loading, result }: {
  isOpen: boolean; onClose: () => void; loading: boolean;
  result: { success: boolean; message: string; summary?: string; importance?: number; topics?: string[] } | null;
}) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
            {loading ? 'Saving to Memory…' : result?.success ? 'Saved Successfully!' : 'Unable to Save'}
          </h2>
          {!loading && <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#6b7280' }}>Analysing conversation and generating memory…</p>
          </div>
        )}

        {!loading && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 14px', background: result.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: result.success ? '#166534' : '#991b1b', margin: 0, fontWeight: 500 }}>{result.message}</p>
            </div>
            {result.importance !== undefined && (
              <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#1e40af', margin: '0 0 2px', fontWeight: 600 }}>Importance Score: {result.importance}/10</p>
                <p style={{ fontSize: 11, color: '#3b82f6', margin: 0 }}>Helps prioritise which memories to recall in future conversations.</p>
              </div>
            )}
            {result.topics && result.topics.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 6px' }}>Key Topics</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.topics.map((topic, idx) => (
                    <span key={idx} style={{ fontSize: 12, padding: '3px 8px', background: '#f5f3ff', color: '#6d28d9', borderRadius: 4 }}>{topic}</span>
                  ))}
                </div>
              </div>
            )}
            {result.summary && (
              <div style={{ padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 6px' }}>Summary</p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.55 }}>{result.summary}</p>
              </div>
            )}
            <button onClick={onClose} style={{ padding: '9px', border: 'none', borderRadius: 6, background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginTop: 4 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DocumentUploadWrapper ── */

function DocumentUploadWrapper({ userId }: { userId: string }) {
  const [DocumentUpload, setDocumentUpload] = useState<any>(null);
  useEffect(() => { import('./components/DocumentUpload').then(mod => setDocumentUpload(() => mod.default)); }, []);
  if (!DocumentUpload) return <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</p>;
  return <DocumentUpload userId={userId} isDarkMode={false} />;
}
