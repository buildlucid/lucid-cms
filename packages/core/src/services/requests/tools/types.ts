import type { ToolkitActor } from "../../../libs/permission/toolkit-actor.js";

export type RequestToolProps = {
	actor: ToolkitActor;
	/** Requests are only in reach when every document is in these collections. */
	allowedCollectionKeys: string[];
};

export type RequestWriteToolProps = RequestToolProps & {
	conversationId: string;
	toolName: string;
};
