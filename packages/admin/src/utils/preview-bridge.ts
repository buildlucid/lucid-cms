const CAPTURE_TIMEOUT_MS = 150;
const RESTORE_TIMEOUT_MS = 5000;

const previewBridgeProtocol = {
	scope: "lucid:builder-preview",
	version: 1,
	messages: {
		ready: "ready",
		captureScroll: "capture-scroll",
		scrollState: "scroll-state",
		restoreScroll: "restore-scroll",
	},
} as const;

type PreviewScrollState = {
	pageKey: string;
	x: number;
	y: number;
};

type IncomingPreviewBridgeMessage =
	| {
			scope: typeof previewBridgeProtocol.scope;
			version: typeof previewBridgeProtocol.version;
			type: typeof previewBridgeProtocol.messages.ready;
	  }
	| {
			scope: typeof previewBridgeProtocol.scope;
			version: typeof previewBridgeProtocol.version;
			type: typeof previewBridgeProtocol.messages.scrollState;
			requestId: string;
			state: PreviewScrollState;
	  };

/** Checks whether a value is a non-null record. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** Validates a scroll position received from the preview iframe. */
const isScrollState = (value: unknown): value is PreviewScrollState =>
	isRecord(value) &&
	typeof value.pageKey === "string" &&
	value.pageKey.length > 0 &&
	typeof value.x === "number" &&
	Number.isFinite(value.x) &&
	typeof value.y === "number" &&
	Number.isFinite(value.y);

/** Validates messages accepted by the admin preview bridge. */
const isPreviewBridgeMessage = (
	value: unknown,
): value is IncomingPreviewBridgeMessage => {
	if (
		!isRecord(value) ||
		value.scope !== previewBridgeProtocol.scope ||
		value.version !== previewBridgeProtocol.version
	) {
		return false;
	}

	if (value.type === previewBridgeProtocol.messages.ready) return true;

	return (
		value.type === previewBridgeProtocol.messages.scrollState &&
		typeof value.requestId === "string" &&
		value.requestId.length > 0 &&
		isScrollState(value.state)
	);
};

type PendingCapture = {
	requestId: string;
	resolve: (state: PreviewScrollState | null) => void;
	timeout: number;
};

/** Adds the preview bridge protocol envelope to a message. */
const createMessage = <TMessage extends object>(message: TMessage) => ({
	scope: previewBridgeProtocol.scope,
	version: previewBridgeProtocol.version,
	...message,
});

/** Creates the admin-side bridge for preview scroll restoration. */
export const createPreviewBridge = () => {
	let frame: HTMLIFrameElement | null = null;
	let requestSequence = 0;
	let pendingCapture: PendingCapture | null = null;
	let pendingRestore: PreviewScrollState | null = null;
	let restoreTimeout: number | undefined;

	/** Resolves the current preview iframe origin. */
	const getFrameOrigin = (): string | null => {
		if (!frame?.isConnected) return null;
		try {
			return new URL(frame.src, window.location.href).origin;
		} catch {
			return null;
		}
	};

	/** Completes and clears the pending scroll capture. */
	const clearCapture = (state: PreviewScrollState | null = null) => {
		if (!pendingCapture) return;
		window.clearTimeout(pendingCapture.timeout);
		pendingCapture.resolve(state);
		pendingCapture = null;
	};

	/** Clears the pending scroll restoration timeout. */
	const clearRestoreTimeout = () => {
		if (restoreTimeout !== undefined) {
			window.clearTimeout(restoreTimeout);
			restoreTimeout = undefined;
		}
	};

	/** Queues a scroll position for the next preview load. */
	const queueScrollRestore = (state: PreviewScrollState | null) => {
		clearRestoreTimeout();
		pendingRestore = state;
		if (state) {
			restoreTimeout = window.setTimeout(() => {
				pendingRestore = null;
				restoreTimeout = undefined;
			}, RESTORE_TIMEOUT_MS);
		}
	};

	/** Handles validated messages from the active preview iframe. */
	const onMessage = (event: MessageEvent<unknown>) => {
		const frameOrigin = getFrameOrigin();
		if (
			!frameOrigin ||
			event.source !== frame?.contentWindow ||
			event.origin !== frameOrigin ||
			!isPreviewBridgeMessage(event.data)
		) {
			return;
		}

		if (
			event.data.type === previewBridgeProtocol.messages.scrollState &&
			event.data.requestId === pendingCapture?.requestId
		) {
			clearCapture(event.data.state);
			return;
		}

		if (
			event.data.type === previewBridgeProtocol.messages.ready &&
			pendingRestore
		) {
			frame?.contentWindow?.postMessage(
				createMessage({
					type: previewBridgeProtocol.messages.restoreScroll,
					state: pendingRestore,
				}),
				event.origin,
			);
			queueScrollRestore(null);
		}
	};

	window.addEventListener("message", onMessage);

	return {
		/** Sets the iframe used by the bridge. */
		setFrame: (element: HTMLIFrameElement) => {
			frame = element;
		},
		/** Requests the current scroll position from the preview iframe. */
		captureScroll: (): Promise<PreviewScrollState | null> => {
			const frameOrigin = getFrameOrigin();
			const frameWindow = frame?.contentWindow;
			if (!frameOrigin || !frameWindow) return Promise.resolve(null);

			clearCapture();
			requestSequence += 1;
			const requestId = `preview-scroll-${requestSequence}`;
			return new Promise((resolve) => {
				pendingCapture = {
					requestId,
					resolve,
					timeout: window.setTimeout(() => clearCapture(), CAPTURE_TIMEOUT_MS),
				};
				frameWindow.postMessage(
					createMessage({
						type: previewBridgeProtocol.messages.captureScroll,
						requestId,
					}),
					frameOrigin,
				);
			});
		},
		queueScrollRestore,
		/** Removes listeners, timeouts, and iframe references. */
		cleanup: () => {
			window.removeEventListener("message", onMessage);
			clearCapture();
			queueScrollRestore(null);
			frame = null;
		},
	};
};
