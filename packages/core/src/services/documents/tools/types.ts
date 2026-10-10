import type { CollectionToolOptions } from "../../../libs/permission/readable-collections.js";
import type { ToolkitActor } from "../../../libs/toolkit/types.js";

export type DocumentWriteToolOptions = CollectionToolOptions & {
	/** Saves as the acting person without a request unless the collection requires review, asking for confirmation unless disabled by the chat or routine; defaults to false. */
	direct?: boolean;
};

export type DocumentWriteToolProps = {
	actor: ToolkitActor;
	conversationId: string;
	toolName: string;
	direct: boolean;
	allowedCollectionKeys: string[];
};
