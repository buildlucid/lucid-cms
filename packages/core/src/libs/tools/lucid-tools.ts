import { getAiUsageAgentTool } from "../../services/ai/tools/usage/index.js";
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
import { findEmailsAgentTool } from "../../services/email/tools/find/index.js";
import { getEmailAgentTool } from "../../services/email/tools/get/index.js";
import { resendEmailAgentTool } from "../../services/email/tools/resend/index.js";
import { findJobsAgentTool } from "../../services/jobs/tools/find/index.js";
import { getJobAgentTool } from "../../services/jobs/tools/get/index.js";
import { listJobSchedulesAgentTool } from "../../services/jobs/tools/list-schedules/index.js";
import { runJobScheduleAgentTool } from "../../services/jobs/tools/run-schedule/index.js";
import {
	listLocalesAgentTool,
	listLocalesMcpTool,
} from "../../services/locales/tools/list/index.js";
import {
	findMediaAgentTool,
	findMediaMcpTool,
} from "../../services/media/tools/find/index.js";
import {
	getMediaAgentTool,
	getMediaMcpTool,
} from "../../services/media/tools/get/index.js";
import { previewMediaMcpTool } from "../../services/media/tools/preview/index.js";
import { selectMediaAgentTool } from "../../services/media/tools/select/index.js";
import { updateMediaAgentTool } from "../../services/media/tools/update/index.js";
import { findNotificationsAgentTool } from "../../services/notifications/tools/find/index.js";
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
import { getRequestsOverviewAgentTool } from "../../services/requests/tools/overview/index.js";
import { replyToRequestAgentTool } from "../../services/requests/tools/reply/index.js";
import { scheduleRequestAgentTool } from "../../services/requests/tools/schedule/index.js";
import { updateRequestCommentAgentTool } from "../../services/requests/tools/update-comment/index.js";
import { updateRequestAgentTool } from "../../services/requests/tools/update/index.js";
import { getSettingsAgentTool } from "../../services/settings/tools/get/index.js";
import {
	findUsersAgentTool,
	findUsersMcpTool,
} from "../../services/users/tools/find/index.js";
import type { CollectionToolOptions } from "../permission/readable-collections.js";

/**
 * Lucid's agent tools and composable bundles, using the run's permissions.
 *
 * @remarks
 * Tools are grouped by resource, e.g. `agentTools.documents.find()` creates `documents_find`.
 * Bundles contain distinct tools and can be combined.
 * `defineAgent.features` configures the built-in web search and reading, media analysis,
 * file reading, image generation and editing, audio generation, add to library and builder tools.
 * Document writes open requests by default; `direct: true` saves changes directly.
 * Request tools cannot approve requests and only reach requests whose documents are all in the tool's `collections`.
 * Immediate actions require confirmation unless the chat or routine disables it.
 *
 * @example
 * ```ts
 * defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	tools: [
 * 		agentTools.read({ collections: ["pages"] }),
 * 		agentTools.edit({ collections: ["pages"] }),
 * 		agentTools.review({ collections: ["pages"] }),
 * 		agentTools.requests.complete({ collections: ["pages"] }),
 * 		agentTools.system(),
 * 	],
 * });
 * ```
 */
export const agentTools = {
	collections: {
		/** Lists the collections the agent can read. */
		list: listCollectionsAgentTool,
		/** Describes a collection's fields, bricks, environments and review rules. */
		describe: describeCollectionAgentTool,
	},
	documents: {
		/** Searches a collection's documents with filters. */
		find: findDocumentsAgentTool,
		/** Reads a document's fields and bricks, or its proposal in a request. */
		get: getDocumentAgentTool,
		/** Creates a document through a create request, or directly with `direct: true`. */
		create: createDocumentAgentTool,
		/** Updates a document through a request, or directly with `direct: true`. */
		update: updateDocumentAgentTool,
		/** Deletes a document through a delete request, or directly with `direct: true`. */
		delete: deleteDocumentAgentTool,
		/** Unpublishes a document through an unpublish request, or directly with `direct: true`. */
		unpublish: unpublishDocumentAgentTool,
	},
	media: {
		/** Searches the media library. */
		find: findMediaAgentTool,
		/** Reads library media and the person's own uploads. */
		get: getMediaAgentTool,
		/** Updates media titles, alt text, descriptions, file names and folders, after the person confirms. */
		update: updateMediaAgentTool,
		/** Asks the person to pick or upload media in the chat, then links it. */
		select: selectMediaAgentTool,
	},
	locales: {
		/** Lists content and interface languages. */
		list: listLocalesAgentTool,
	},
	users: {
		/** Finds people, eg. for user fields, mentions and request reviewers. */
		find: findUsersAgentTool,
	},
	requests: {
		/** Finds requests, open ones by default. */
		find: findRequestsAgentTool,
		/** Reads a request with its documents, blockers and comments. */
		get: getRequestAgentTool,
		/** Counts open requests and how far each environment is behind latest, like the Review page. */
		overview: getRequestsOverviewAgentTool,
		/** Comments on a request, which blocks approval until it is resolved or closed. */
		comment: commentOnRequestAgentTool,
		/** Replies to a comment on a request. */
		reply: replyToRequestAgentTool,
		/** Resolves, closes, reopens, edits or removes the agent's own comments. */
		updateComment: updateRequestCommentAgentTool,
		/** Acknowledges targets that changed while a request was open. */
		acknowledge: acknowledgeRequestAgentTool,
		/** Changes a request's details, reviewers, documents, targets and status. */
		update: updateRequestAgentTool,
		/** Completes approved requests, after the person confirms. */
		complete: completeRequestAgentTool,
		/** Schedules approved requests for completion, after the person confirms. */
		schedule: scheduleRequestAgentTool,
	},
	emails: {
		/** Finds sent emails and delivery failures. */
		find: findEmailsAgentTool,
		/** Reads an email with its delivery attempts. */
		get: getEmailAgentTool,
		/** Sends a stored email again, after the person confirms. */
		resend: resendEmailAgentTool,
	},
	jobs: {
		/** Finds background jobs and failures. */
		find: findJobsAgentTool,
		/** Reads a background job with its error stack. */
		get: getJobAgentTool,
		/** Lists job schedules and their next runs. */
		listSchedules: listJobSchedulesAgentTool,
		/** Queues a job schedule to run now, after the person confirms. */
		runSchedule: runJobScheduleAgentTool,
	},
	settings: {
		/** Reads how the CMS is set up. */
		get: getSettingsAgentTool,
	},
	aiUsage: {
		/** Reads AI credits, sessions and daily totals. */
		get: getAiUsageAgentTool,
	},
	notifications: {
		/** Finds notifications for the person the run acts for, excluding system routines. */
		find: findNotificationsAgentTool,
	},
	/** Reads collections, documents, media, locales and users. */
	read: (options: CollectionToolOptions = {}) => [
		listCollectionsAgentTool(options),
		describeCollectionAgentTool(options),
		findDocumentsAgentTool(options),
		getDocumentAgentTool(options),
		findMediaAgentTool(),
		getMediaAgentTool(),
		listLocalesAgentTool(),
		findUsersAgentTool(options),
	],
	/** Creates, updates, deletes and unpublishes documents for use alongside `read()`. */
	edit: (options: DocumentWriteToolOptions = {}) => [
		createDocumentAgentTool(options),
		updateDocumentAgentTool(options),
		deleteDocumentAgentTool(options),
		unpublishDocumentAgentTool(options),
	],
	/** Finds and reads requests and the review overview, comments on requests and acknowledges changed targets. */
	review: (options: CollectionToolOptions = {}) => [
		findRequestsAgentTool(options),
		getRequestAgentTool(options),
		getRequestsOverviewAgentTool(options),
		commentOnRequestAgentTool(options),
		replyToRequestAgentTool(options),
		updateRequestCommentAgentTool(options),
		acknowledgeRequestAgentTool(options),
	],
	/** Reads emails, jobs, schedules, settings and AI usage; add `emails.resend` or `jobs.runSchedule` to act on them. */
	system: () => [
		findEmailsAgentTool(),
		getEmailAgentTool(),
		findJobsAgentTool(),
		getJobAgentTool(),
		listJobSchedulesAgentTool(),
		getSettingsAgentTool(),
		getAiUsageAgentTool(),
	],
};

/**
 * Lucid's tools for MCP clients, grouped and named like `agentTools`. Add them
 * to `ai.mcp.tools`, or use `all()`. MCP only serves the tools it lists. Every
 * tool only reads, using the connection's granted scopes.
 *
 * @example
 * ```ts
 * ai: { mcp: { tools: [mcpTools.all()] } }
 * ```
 */
export const mcpTools = {
	collections: {
		/** Lists the collections the connection can read. */
		list: listCollectionsMcpTool,
		/** Describes a collection's fields, bricks, environments and review rules. */
		describe: describeCollectionMcpTool,
	},
	documents: {
		/** Searches a collection's documents with filters. */
		find: findDocumentsMcpTool,
		/** Reads a document's fields and bricks. */
		get: getDocumentMcpTool,
	},
	media: {
		/** Searches the media library. */
		find: findMediaMcpTool,
		/** Reads a media library item. */
		get: getMediaMcpTool,
		/** Returns an image or video poster as a link or inline image. */
		preview: previewMediaMcpTool,
	},
	locales: {
		/** Lists content and interface languages. */
		list: listLocalesMcpTool,
	},
	users: {
		/** Finds people, eg. who a user field or request names. */
		find: findUsersMcpTool,
	},
	requests: {
		/** Finds requests, open ones by default. */
		find: findRequestsMcpTool,
		/** Reads a request with its documents, blockers and comments. */
		get: getRequestMcpTool,
	},
	/** Every MCP tool. */
	all: (options: CollectionToolOptions = {}) => [
		listCollectionsMcpTool(options),
		describeCollectionMcpTool(options),
		findDocumentsMcpTool(options),
		getDocumentMcpTool(options),
		findMediaMcpTool(),
		getMediaMcpTool(),
		previewMediaMcpTool(),
		listLocalesMcpTool(),
		findUsersMcpTool(options),
		findRequestsMcpTool(options),
		getRequestMcpTool(options),
	],
};
