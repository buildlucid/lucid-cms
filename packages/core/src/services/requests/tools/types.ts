import type { ToolkitActor } from "../../../libs/toolkit/types.js";

export type RequestToolProps = {
	actor: ToolkitActor;
	/** Requests are only in reach when every document is in these collections. */
	allowedCollectionKeys: string[];
};

export type RequestWriteToolProps = RequestToolProps & {
	runId: string;
	conversationId: string;
	toolName: string;
};
