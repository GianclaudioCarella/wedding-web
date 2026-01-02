// GC-Agent - Generic Chat Agent
// Main exports for easy importing

export { GenericAgent } from './agent';
export type { AgentResponse } from './agent';

export { ToolRegistry } from './tools/tool-registry';
export { SearchWebTool } from './tools/search-web.tool';
export type { CacheBackend } from './tools/search-web.tool';

export {
  GenericChatService,
  GenericUserSettingsService,
  type DatabaseClient,
} from './services/database.service';

export {
  normalizeQueryForCache,
  hashString,
} from './services/cache.service';

export {
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_MESSAGE,
  DEFAULT_TOOLS,
} from './constants';

export type {
  Message,
  Conversation,
  Model,
  MemorySaveResult,
  SearchWebResult,
  AgentConfig,
  Tool,
  ToolExecutor,
} from './types';
