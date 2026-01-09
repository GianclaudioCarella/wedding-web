/**
 * Memory Search Tool
 * Allows AI to search through saved conversation memories
 */

import { SupabaseClient } from '@supabase/supabase-js';

export class MemoryTools {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Search through conversation memories/summaries
   */
  async searchMemories(query: string, userId: string): Promise<string> {
    try {
      // Search for memories that match the query in summary or key_topics
      const { data: memories, error } = await this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      if (!memories || memories.length === 0) {
        return 'No saved memories found. Use the "Remember me" button to save important conversations for future reference.';
      }

      // Filter memories that are relevant to the query
      const queryLower = query.toLowerCase();
      const relevantMemories = memories.filter(memory => {
        const summaryMatch = memory.summary.toLowerCase().includes(queryLower);
        const topicsMatch = memory.key_topics?.some((topic: string) => 
          topic.toLowerCase().includes(queryLower) || queryLower.includes(topic.toLowerCase())
        );
        return summaryMatch || topicsMatch;
      });

      if (relevantMemories.length === 0) {
        return `No memories found related to "${query}". Available topics in saved memories: ${
          [...new Set(memories.flatMap(m => m.key_topics || []))].slice(0, 10).join(', ')
        }`;
      }

      // Format the results
      let response = `Found ${relevantMemories.length} relevant ${relevantMemories.length === 1 ? 'memory' : 'memories'}:\n\n`;
      
      relevantMemories.forEach((memory, index) => {
        const date = new Date(memory.created_at).toLocaleDateString();
        response += `**Memory ${index + 1}** (${date}, importance: ${memory.importance_score}/10)\n`;
        response += `Topics: ${memory.key_topics?.join(', ') || 'none'}\n`;
        response += `${memory.summary}\n\n`;
      });

      return response;
    } catch (error) {
      console.error('Error searching memories:', error);
      return 'Error searching memories. Please try again.';
    }
  }

  /**
   * Get all saved memories (for general recall)
   */
  async getAllMemories(userId: string, limit: number = 5): Promise<string> {
    try {
      const { data: memories, error } = await this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!memories || memories.length === 0) {
        return 'No saved memories found yet.';
      }

      let response = `Here are the ${memories.length} most important saved memories:\n\n`;
      
      memories.forEach((memory, index) => {
        const date = new Date(memory.created_at).toLocaleDateString();
        response += `**Memory ${index + 1}** (${date}, importance: ${memory.importance_score}/10)\n`;
        response += `Topics: ${memory.key_topics?.join(', ') || 'none'}\n`;
        response += `${memory.summary}\n\n`;
      });

      return response;
    } catch (error) {
      console.error('Error getting memories:', error);
      return 'Error retrieving memories. Please try again.';
    }
  }
}
