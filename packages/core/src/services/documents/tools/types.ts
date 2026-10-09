import type { CollectionToolOptions } from "../../../libs/permission/readable-collections.js";
import type { ToolkitActor } from "../../../libs/toolkit/types.js";

export type DocumentWriteToolOptions = CollectionToolOptions & {
	/**
	 * Saves changes directly, as a person could in the admin, rather than always
	 * opening a request. Collections that require review still get a request.
	 * Less safe, as changes skip review, so each call asks for approval unless
	 * the chat or routine turns that off. Defaults to false.
	 */
	direct?: boolean;
};

export type DocumentWriteToolProps = {
	actor: ToolkitActor;
	conversationId: string;
	toolName: string;
	direct: boolean;
	allowedCollectionKeys: string[];
};
