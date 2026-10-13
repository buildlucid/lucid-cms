import type { CollectionToolOptions } from "../../../libs/permission/readable-collections.js";
import type { ToolkitActor } from "../../../libs/permission/toolkit-actor.js";

export type DocumentWriteToolOptions = CollectionToolOptions & {
	/**
	 * Allows direct writes as the acting principal when collection review is optional, defaulting to false.
	 * @remarks Writes bypassing requests require confirmation unless chat or routine policy disables it.
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
