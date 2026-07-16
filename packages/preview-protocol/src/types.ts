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

export type PreviewReadyMessage = PreviewEnvelope & {
	type: typeof previewProtocol.messages.ready;
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

export type PreviewChildMessage =
	| PreviewReadyMessage
	| PreviewScrollStateMessage
	| PreviewFocusFieldMessage;

export type PreviewParentMessage =
	| PreviewConnectMessage
	| PreviewCaptureScrollMessage
	| PreviewRestoreScrollMessage;

export type PreviewMessagePayload =
	| { type: typeof previewProtocol.messages.ready }
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
	  };
