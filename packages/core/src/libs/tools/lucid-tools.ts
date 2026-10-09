import {
	describeCollectionAgentTool,
	describeCollectionMcpTool,
} from "../../services/collections/tools/describe/index.js";
import {
	listCollectionsAgentTool,
	listCollectionsMcpTool,
} from "../../services/collections/tools/list/index.js";
import { createDocumentAgentTool } from "../../services/documents/tools/create/index.js";
import { deleteDocumentAgentTool } from "../../services/documents/tools/delete/index.js";
import {
	findDocumentsAgentTool,
	findDocumentsMcpTool,
} from "../../services/documents/tools/find/index.js";
import {
	getDocumentAgentTool,
	getDocumentMcpTool,
} from "../../services/documents/tools/get/index.js";
import type { DocumentWriteToolOptions } from "../../services/documents/tools/types.js";
import { unpublishDocumentAgentTool } from "../../services/documents/tools/unpublish/index.js";
import { updateDocumentAgentTool } from "../../services/documents/tools/update/index.js";
import {
	listLocalesAgentTool,
	listLocalesMcpTool,
} from "../../services/locales/tools/list/index.js";
import {
	findMediaAgentTool,
	findMediaMcpTool,
} from "../../services/media/tools/find/index.js";
import { previewMediaMcpTool } from "../../services/media/tools/preview/index.js";
import type { CollectionToolOptions } from "../permission/readable-collections.js";

/**
 * Lucid's tools for agents. Call one to add it to an agent's `tools`, or use
 * a bundle such as `content()`. Web, media analysis, file reading and library tools are
 * built in and configured with `defineAgent`'s `features`. Every tool uses the
 * permissions of the person the agent acts for.
 *
 * Document writes open requests for people to review by default. Pass
 * `direct: true` to let them save changes as a person could in the admin.
 *
 * @example
 * ```ts
 * defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	tools: [
 * 		agentTools.content({ collections: ["pages"] }),
 * 		agentTools.editing({ collections: ["pages"] }),
 * 		agentTools.deleteDocument({ collections: ["pages"], direct: true }),
 * 	],
 * });
 * ```
 */
export const agentTools = {
	listCollections: listCollectionsAgentTool,
	describeCollection: describeCollectionAgentTool,
	findDocuments: findDocumentsAgentTool,
	getDocument: getDocumentAgentTool,
	findMedia: findMediaAgentTool,
	listLocales: listLocalesAgentTool,
	createDocument: createDocumentAgentTool,
	updateDocument: updateDocumentAgentTool,
	deleteDocument: deleteDocumentAgentTool,
	unpublishDocument: unpublishDocumentAgentTool,
	/** Every content reading tool: collections, documents, media and locales. */
	content: (options: CollectionToolOptions = {}) => [
		listCollectionsAgentTool(options),
		describeCollectionAgentTool(options),
		findDocumentsAgentTool(options),
		getDocumentAgentTool(options),
		findMediaAgentTool(),
		listLocalesAgentTool(),
	],
	/** Bundles document creation, updates, deletion and unpublishing for use alongside `content()` reads. */
	editing: (options: DocumentWriteToolOptions = {}) => [
		createDocumentAgentTool(options),
		updateDocumentAgentTool(options),
		deleteDocumentAgentTool(options),
		unpublishDocumentAgentTool(options),
	],
};

/**
 * Lucid's tools for MCP clients. Call one to add it to `ai.mcp.tools`, or use
 * `content()` for all of them. MCP only serves the tools it lists. Every tool
 * uses the connection's granted scopes.
 *
 * @example
 * ```ts
 * ai: { mcp: { tools: [mcpTools.content()] } }
 * ```
 */
export const mcpTools = {
	listCollections: listCollectionsMcpTool,
	describeCollection: describeCollectionMcpTool,
	findDocuments: findDocumentsMcpTool,
	getDocument: getDocumentMcpTool,
	findMedia: findMediaMcpTool,
	previewMedia: previewMediaMcpTool,
	listLocales: listLocalesMcpTool,
	/** Every content reading tool: collections, documents, media and locales. */
	content: (options: CollectionToolOptions = {}) => [
		listCollectionsMcpTool(options),
		describeCollectionMcpTool(options),
		findDocumentsMcpTool(options),
		getDocumentMcpTool(options),
		findMediaMcpTool(),
		previewMediaMcpTool(),
		listLocalesMcpTool(),
	],
};
