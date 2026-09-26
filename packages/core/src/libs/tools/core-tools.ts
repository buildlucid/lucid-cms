import {
	describeCollectionAgentTool,
	describeCollectionMcpTool,
} from "../../services/collections/tools/describe/index.js";
import {
	listCollectionsAgentTool,
	listCollectionsMcpTool,
} from "../../services/collections/tools/list/index.js";
import {
	findDocumentsAgentTool,
	findDocumentsMcpTool,
} from "../../services/documents/tools/find/index.js";
import {
	getDocumentAgentTool,
	getDocumentMcpTool,
} from "../../services/documents/tools/get/index.js";
import {
	listLocalesAgentTool,
	listLocalesMcpTool,
} from "../../services/locales/tools/list/index.js";
import {
	findMediaAgentTool,
	findMediaMcpTool,
} from "../../services/media/tools/find/index.js";
import { previewMediaMcpTool } from "../../services/media/tools/preview/index.js";
import type { AgentToolDefinition, McpToolDefinition } from "./types.js";

/** Read-only content tools available on every MCP server. */
export const getCoreMcpTools = (): readonly McpToolDefinition[] => [
	listCollectionsMcpTool,
	describeCollectionMcpTool,
	findDocumentsMcpTool,
	getDocumentMcpTool,
	findMediaMcpTool,
	previewMediaMcpTool,
	listLocalesMcpTool,
];

/** Read-only content tools available on every agent. */
export const getCoreAgentTools = (): readonly AgentToolDefinition[] => [
	listCollectionsAgentTool,
	describeCollectionAgentTool,
	findDocumentsAgentTool,
	getDocumentAgentTool,
	findMediaAgentTool,
	listLocalesAgentTool,
];
