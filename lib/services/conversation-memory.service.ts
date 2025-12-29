/**
 * ConversationMemoryService
 * 
 * Manages cross-conversation memory by creating and retrieving summaries
 * of past conversations. This allows the AI to maintain context across
 * multiple chat sessions without loading all historical messages.
 * 
 * Features:
 * - Automatic summary generation using AI
 * - Relevance scoring and topic extraction
 * - Efficient retrieval of recent/important memories
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  user_id: string;
  summary: string;
  key_topics: string[];
  importance_score: number;
  message_count: number;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ConversationMemoryService {
  private supabase: SupabaseClient;
  private githubToken: string;

  constructor(supabase: SupabaseClient, githubToken: string) {
    this.supabase = supabase;
    this.githubToken = githubToken;
  }

  /**
   * Generates a summary of a conversation using AI.
   * The summary captures key information, decisions, and context
   * that should be remembered in future conversations.
   * 
   * @param conversationId - The ID of the conversation to summarize
   * @returns Promise with the generated summary data
   */
  async generateConversationSummary(
    conversationId: string,
    userId: string
  ): Promise<ConversationSummary | null> {
    try {
      // Step 1: Load all messages from the conversation
      const { data: messages, error: messagesError } = await this.supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        throw new Error(`Failed to load messages: ${messagesError.message}`);
      }

      if (!messages || messages.length < 2) {
        // Not enough messages to summarize
        return null;
      }

      // Step 2: Build conversation text for summarization
      const conversationText = messages
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      // Step 3: Use AI to generate summary
      const summaryPrompt = `You are analyzing a conversation to create a concise memory summary. Extract the most important information that should be remembered in future conversations.

Focus on:
- Key facts and information shared
- Important decisions or preferences mentioned
- Specific details about events, people, or dates
- Action items or follow-ups needed
- Any wedding-specific details (dates, venues, guest counts, etc.)

Provide your response in this JSON format:
{
  "summary": "A concise 2-3 sentence summary of the key points",
  "key_topics": ["topic1", "topic2", "topic3"],
  "importance_score": 1-10 (how important is this conversation to remember)
}

CONVERSATION TO SUMMARIZE:
${conversationText}`;

      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: summaryPrompt }],
          model: 'gpt-4o',
          temperature: 0.3, // Lower temperature for more consistent summaries
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.choices[0].message.content;

      // Step 4: Parse AI response
      let summaryData;
      try {
        // Try to parse JSON response
        const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          summaryData = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback if AI didn't return proper JSON
          summaryData = {
            summary: summaryText,
            key_topics: [],
            importance_score: 5,
          };
        }
      } catch (parseError) {
        // Fallback parsing failed
        summaryData = {
          summary: summaryText.substring(0, 500),
          key_topics: [],
          importance_score: 5,
        };
      }

      // Step 5: Save summary to database
      const { data: savedSummary, error: saveError } = await this.supabase
        .from('conversation_summaries')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          summary: summaryData.summary,
          key_topics: summaryData.key_topics || [],
          importance_score: summaryData.importance_score || 5,
          message_count: messages.length,
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to save summary: ${saveError.message}`);
      }

      return savedSummary as ConversationSummary;
    } catch (error) {
      console.error('Error generating conversation summary:', error);
      throw error;
    }
  }

  /**
   * Retrieves recent conversation summaries for a user.
   * Useful for building context from past conversations.
   * 
   * @param userId - The user ID
   * @param limit - Maximum number of summaries to retrieve
   * @param minImportance - Minimum importance score (1-10)
   * @returns Promise with array of summaries
   */
  async getRecentSummaries(
    userId: string,
    limit: number = 5,
    minImportance: number = 3
  ): Promise<ConversationSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .gte('importance_score', minImportance)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to retrieve summaries: ${error.message}`);
      }

      return (data || []) as ConversationSummary[];
    } catch (error) {
      console.error('Error retrieving summaries:', error);
      return [];
    }
  }

  /**
   * Formats summaries into a readable memory context for the AI.
   * This context can be included in the system message.
   * 
   * @param summaries - Array of conversation summaries
   * @returns Formatted memory context string
   */
  formatMemoryContext(summaries: ConversationSummary[]): string {
    if (summaries.length === 0) {
      return '';
    }

    const memoryItems = summaries.map((summary, index) => {
      const date = new Date(summary.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const topics = summary.key_topics.length > 0 
        ? ` [Topics: ${summary.key_topics.join(', ')}]`
        : '';
      
      return `${index + 1}. (${date}${topics}): ${summary.summary}`;
    });

    return `PREVIOUS CONVERSATION MEMORIES:
The following are summaries of recent conversations with this user. Use this context to maintain continuity and avoid asking for information already discussed.

${memoryItems.join('\n\n')}

---`;
  }

  /**
   * Checks if a conversation should be summarized.
   * Criteria: Has at least 4 messages (2 exchanges) and no existing summary.
   * 
   * @param conversationId - The conversation ID to check
   * @returns Promise with boolean indicating if summary should be created
   */
  async shouldSummarizeConversation(conversationId: string): Promise<boolean> {
    try {
      // Check if summary already exists
      const { data: existingSummary } = await this.supabase
        .from('conversation_summaries')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      if (existingSummary) {
        return false; // Already has a summary
      }

      // Check message count
      const { count, error } = await this.supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Error checking message count:', error);
        return false;
      }

      // Require at least 4 messages (2 user, 2 assistant minimum)
      return (count || 0) >= 4;
    } catch (error) {
      console.error('Error checking if conversation should be summarized:', error);
      return false;
    }
  }

  /**
   * Deletes a conversation summary.
   * 
   * @param summaryId - The summary ID to delete
   */
  async deleteSummary(summaryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_summaries')
      .delete()
      .eq('id', summaryId);

    if (error) {
      throw new Error(`Failed to delete summary: ${error.message}`);
    }
  }

  /**
   * Gets summary statistics for a user.
   */
  async getSummaryStats(userId: string): Promise<{
    totalSummaries: number;
    totalMessages: number;
    averageImportance: number;
  }> {
    const { data, error } = await this.supabase
      .from('conversation_summaries')
      .select('importance_score, message_count')
      .eq('user_id', userId);

    if (error || !data) {
      return { totalSummaries: 0, totalMessages: 0, averageImportance: 0 };
    }

    const totalSummaries = data.length;
    const totalMessages = data.reduce((sum, s) => sum + s.message_count, 0);
    const averageImportance = totalSummaries > 0
      ? data.reduce((sum, s) => sum + s.importance_score, 0) / totalSummaries
      : 0;

    return {
      totalSummaries,
      totalMessages,
      averageImportance: Math.round(averageImportance * 10) / 10,
    };
  }
}
