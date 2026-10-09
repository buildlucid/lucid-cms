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
import { acknowledgeRequestAgentTool } from "../../services/requests/tools/acknowledge/index.js";
import { commentOnRequestAgentTool } from "../../services/requests/tools/comment/index.js";
import { completeRequestAgentTool } from "../../services/requests/tools/complete/index.js";
import {
	findRequestsAgentTool,
	findRequestsMcpTool,
} from "../../services/requests/tools/find/index.js";
import {
	getRequestAgentTool,
	getRequestMcpTool,
} from "../../services/requests/tools/get/index.js";
import { replyToRequestAgentTool } from "../../services/requests/tools/reply/index.js";
import { scheduleRequestAgentTool } from "../../services/requests/tools/schedule/index.js";
import { updateRequestAgentTool } from "../../services/requests/tools/update/index.js";
import { updateRequestCommentAgentTool } from "../../services/requests/tools/update-comment/index.js";
import {
	findUsersAgentTool,
	findUsersMcpTool,
} from "../../services/users/tools/find/index.js";
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
 * Request tools let agents read, discuss and manage requests. They can't
 * approve them, so people stay in charge of what goes live. A request is
 * only in reach when all its documents are in the tool's `collections`.
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
 * 		agentTools.requests({ collections: ["pages"] }),
 * 		agentTools.reviewing({ collections: ["pages"] }),
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
	findUsers: findUsersAgentTool,
	createDocument: createDocumentAgentTool,
	updateDocument: updateDocumentAgentTool,
	deleteDocument: deleteDocumentAgentTool,
	unpublishDocument: unpublishDocumentAgentTool,
	findRequests: findRequestsAgentTool,
	getRequest: getRequestAgentTool,
	commentOnRequest: commentOnRequestAgentTool,
	replyToRequest: replyToRequestAgentTool,
	updateRequestComment: updateRequestCommentAgentTool,
	acknowledgeRequest: acknowledgeRequestAgentTool,
	/** Changes a request's details, reviewers, documents and status. */
	updateRequest: updateRequestAgentTool,
	/** Completes approved requests, asking for approval unless the chat or routine disables it. */
	completeRequest: completeRequestAgentTool,
	/** Schedules approved requests for completion, asking for approval unless the chat or routine disables it. */
	scheduleRequest: scheduleRequestAgentTool,
	/** Every content reading tool: collections, documents, media, locales and users. */
	content: (options: CollectionToolOptions = {}) => [
		listCollectionsAgentTool(options),
		describeCollectionAgentTool(options),
		findDocumentsAgentTool(options),
		getDocumentAgentTool(options),
		findMediaAgentTool(),
		listLocalesAgentTool(),
		findUsersAgentTool(options),
	],
	/** Bundles document creation, updates, deletion and unpublishing for use alongside `content()` reads. */
	editing: (options: DocumentWriteToolOptions = {}) => [
		createDocumentAgentTool(options),
		updateDocumentAgentTool(options),
		deleteDocumentAgentTool(options),
		unpublishDocumentAgentTool(options),
	],
	/** Finding and reading requests, with their documents, blockers and comments. */
	requests: (options: CollectionToolOptions = {}) => [
		findRequestsAgentTool(options),
		getRequestAgentTool(options),
	],
	/** Commenting on and replying to requests, managing the agent's own comments and acknowledging changed targets, for use alongside `requests()`. */
	reviewing: (options: CollectionToolOptions = {}) => [
		commentOnRequestAgentTool(options),
		replyToRequestAgentTool(options),
		updateRequestCommentAgentTool(options),
		acknowledgeRequestAgentTool(options),
	],
};

/**
 * Lucid's tools for MCP clients. Call one to add it to `ai.mcp.tools`, or use
 * a bundle such as `content()`. MCP only serves the tools it lists. Every tool
 * uses the connection's granted scopes.
 *
 * @example
 * ```ts
 * ai: { mcp: { tools: [mcpTools.content(), mcpTools.requests()] } }
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
	findUsers: findUsersMcpTool,
	findRequests: findRequestsMcpTool,
	getRequest: getRequestMcpTool,
	/** Every content reading tool: collections, documents, media, locales and users. */
	content: (options: CollectionToolOptions = {}) => [
		listCollectionsMcpTool(options),
		describeCollectionMcpTool(options),
		findDocumentsMcpTool(options),
		getDocumentMcpTool(options),
		findMediaMcpTool(),
		previewMediaMcpTool(),
		listLocalesMcpTool(),
		findUsersMcpTool(options),
	],
	/** Provides request finding and reading with the `requests:read` scope. */
	requests: (options: CollectionToolOptions = {}) => [
		findRequestsMcpTool(options),
		getRequestMcpTool(options),
	],
};
