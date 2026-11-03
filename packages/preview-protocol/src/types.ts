import type { previewProtocol } from "./constants.js";

export type PreviewFieldBrick = {
	type: "fixed" | "builder";
	key: string;
	order: number;
};

export type PreviewFieldTarget = {
	collectionKey: string;
	documentId: number;
	brick?: PreviewFieldBrick;
	path: Array<string | number>;
	locale?: string;
};

export type PreviewScrollState = {
	pageKey: string;
	x: number;
	y: number;
};

export type PreviewEnvelope = {
	scope: typeof previewProtocol.scope;
	version: typeof previewProtocol.version;
};

/** Announces the preview runtime, again whenever `updates` changes. */
export type PreviewReadyMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.ready;
	/** Whether the page re-renders itself on updates. Without it the builder reloads the frame. */
	updates: boolean;
};

/** Says the page is going away, so updates wait for the next page to announce itself. */
export type PreviewUnloadMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.unload;
};

export type PreviewConnectMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.connect;
};

export type PreviewCaptureScrollMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.captureScroll;
	requestId: string;
};

export type PreviewScrollStateMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.scrollState;
	requestId: string;
	state: PreviewScrollState;
};

export type PreviewRestoreScrollMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.restoreScroll;
	state: PreviewScrollState;
};

export type PreviewFocusFieldMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.focusField;
	target: PreviewFieldTarget;
};

/** Says the previewed content changed, either unsaved edits or a save. Revisions only increase within one preview. */
export type PreviewUpdateMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.update;
	revision: number;
};

export type PreviewChildMessage =
	| PreviewReadyMessage
	| PreviewUnloadMessage
	| PreviewScrollStateMessage
	| PreviewFocusFieldMessage;

export type PreviewParentMessage =
	| PreviewConnectMessage
	| PreviewCaptureScrollMessage
	| PreviewRestoreScrollMessage
	| PreviewUpdateMessage;

export type PreviewMessagePayload =
	| { type: typeof previewProtocol.messages.ready; updates: boolean }
	| { type: typeof previewProtocol.messages.unload }
	| { type: typeof previewProtocol.messages.connect }
	| {
			type: typeof previewProtocol.messages.captureScroll;
			requestId: string;
	  }
	| {
			type: typeof previewProtocol.messages.scrollState;
			requestId: string;
			state: PreviewScrollState;
	  }
	| {
			type: typeof previewProtocol.messages.restoreScroll;
			state: PreviewScrollState;
	  }
	| {
			type: typeof previewProtocol.messages.focusField;
			target: PreviewFieldTarget;
	  }
	| {
			type: typeof previewProtocol.messages.update;
			revision: number;
	  };
