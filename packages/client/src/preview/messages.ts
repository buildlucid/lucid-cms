export const previewBridgeProtocol = {
	scope: "lucid:builder-preview",
	version: 1,
	messages: {
		ready: "ready",
		captureScroll: "capture-scroll",
		scrollState: "scroll-state",
		restoreScroll: "restore-scroll",
	},
} as const;

export type PreviewScrollState = {
	pageKey: string;
	x: number;
	y: number;
};

type PreviewBridgeEnvelope = {
	scope: typeof previewBridgeProtocol.scope;
	version: typeof previewBridgeProtocol.version;
};

type PreviewBridgeMessage =
	| (PreviewBridgeEnvelope & {
			type: typeof previewBridgeProtocol.messages.ready;
	  })
	| (PreviewBridgeEnvelope & {
			type: typeof previewBridgeProtocol.messages.captureScroll;
			requestId: string;
	  })
	| (PreviewBridgeEnvelope & {
			type: typeof previewBridgeProtocol.messages.scrollState;
			requestId: string;
			state: PreviewScrollState;
	  })
	| (PreviewBridgeEnvelope & {
			type: typeof previewBridgeProtocol.messages.restoreScroll;
			state: PreviewScrollState;
	  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isScrollState = (value: unknown): value is PreviewScrollState =>
	isRecord(value) &&
	typeof value.pageKey === "string" &&
	value.pageKey.length > 0 &&
	typeof value.x === "number" &&
	Number.isFinite(value.x) &&
	typeof value.y === "number" &&
	Number.isFinite(value.y);

/** Validates messages exchanged between Lucid admin and its preview iframe. */
export const isPreviewBridgeMessage = (
	value: unknown,
): value is PreviewBridgeMessage => {
	if (
		!isRecord(value) ||
		value.scope !== previewBridgeProtocol.scope ||
		value.version !== previewBridgeProtocol.version
	) {
		return false;
	}

	switch (value.type) {
		case previewBridgeProtocol.messages.ready:
			return true;
		case previewBridgeProtocol.messages.captureScroll:
			return typeof value.requestId === "string" && value.requestId.length > 0;
		case previewBridgeProtocol.messages.scrollState:
			return (
				typeof value.requestId === "string" &&
				value.requestId.length > 0 &&
				isScrollState(value.state)
			);
		case previewBridgeProtocol.messages.restoreScroll:
			return isScrollState(value.state);
		default:
			return false;
	}
};
