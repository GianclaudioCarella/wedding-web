// Generic tool registry for managing custom tools
// This allows users to add their own domain-specific tools

import { Tool, ToolExecutor } from '../types';

/**
 * Tool Registry
 * Manages tool definitions and their executors
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  /**
   * Register a new tool
   */
  registerTool(tool: Tool, executor: ToolExecutor): void {
    if (this.tools.has(tool.function.name)) {
      console.warn(`Tool ${tool.function.name} is already registered. Overwriting.`);
    }
    
    this.tools.set(tool.function.name, tool);
    this.executors.set(tool.function.name, executor);
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: Array<{ tool: Tool; executor: ToolExecutor }>): void {
    for (const { tool, executor } of tools) {
      this.registerTool(tool, executor);
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): boolean {
    const toolDeleted = this.tools.delete(toolName);
    const executorDeleted = this.executors.delete(toolName);
    return toolDeleted && executorDeleted;
  }

  /**
   * Get all registered tools (for API calls)
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool definition
   */
  getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    const executor = this.executors.get(toolName);
    
    if (!executor) {
      throw new Error(`Tool ${toolName} not found`);
    }

    return await executor.execute(args);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get list of registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.executors.clear();
  }
}
