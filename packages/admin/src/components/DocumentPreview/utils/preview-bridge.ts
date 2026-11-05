import {
	createPreviewMessage,
	isPreviewChildMessage,
	isSamePreviewTarget,
	type PreviewEditing,
	type PreviewFieldTarget,
	type PreviewHover,
	type PreviewDragged,
	type PreviewPlace,
	type PreviewScrollState,
	previewProtocol,
	previewQueryParams,
} from "@/preview/protocol";

const CAPTURE_TIMEOUT_MS = 150;
const RESTORE_TIMEOUT_MS = 5000;
//* how long a loaded page has to announce its runtime before it's treated as having none
const READY_GRACE_MS = 1500;
//* revisions remembered for matching pages that loaded during a run of edits
const SHOWN_HISTORY = 20;

type PendingCapture = {
	requestId: string;
	resolve: (state: PreviewScrollState | null) => void;
	timeout: number;
};

/**
 * What the bridge knows about the page in the frame: still loading, running
 * the preview runtime (which may re-render itself on updates), or without one.
 */
type FramePage =
	| { state: "loading" }
	| { state: "ready"; updates: boolean }
	| { state: "static" };

/**
 * Connects preview scrolling, field focus, editing and content updates. Reloads pages without
 * update handlers, and queues updates during navigation and while a field is typed into.
 */
export const createPreviewBridge = (options?: {
	onFocusField?: (target: PreviewFieldTarget) => void;
	/** Runs when the page asks to move a brick or item, after a drag or keyboard move. */
	onMove?: (
		target: PreviewFieldTarget,
		place: PreviewPlace,
		anchor: PreviewFieldTarget,
	) => void;
	/** Runs with what the pointer is over on the page, or null when the page goes or edit mode ends. */
	onHover?: (hover: PreviewHover | null) => void;
	/** Runs when the page shows a newer revision, eg. to point out what waited for it. */
	onRendered?: () => void;
	/** Runs when the user clears the page's selection, or makes their own. */
	onDeselect?: () => void;
	/** Runs when the bridge reloads the frame, eg. to show a loading state. */
	onReload?: () => void;
	/** Runs when a link on the page is clicked, which the preview doesn't follow. */
	onNavigationLocked?: () => void;
	/** Runs when the page asks to edit a selected field, with the text its element shows when that's all it holds. */
	onEdit?: (target: PreviewFieldTarget, text: string | null) => void;
	/** Runs with the text typed into a field on the page so far. */
	onInlineInput?: (target: PreviewFieldTarget, value: string) => void;
	/** Runs when typing on the page ends, kept or `cancelled`, including when the page goes. */
	onInlineEnd?: (target: PreviewFieldTarget, cancelled: boolean) => void;
}) => {
	let frame: HTMLIFrameElement | null = null;
	let page: FramePage = { state: "loading" };
	let editing: PreviewEditing | null = null;
	//* a brick or item dragged in the builder's fields, shown on every page the frame loads until it's dropped
	let dragged: PreviewDragged | null = null;
	//* the field being typed into on the page, which updates wait for so a re-render can't move its caret
	let typing: PreviewFieldTarget | null = null;
	let pendingRevision: number | null = null;
	//* the newest revision shown, when recent ones were, and the one the page shows
	let latestRevision = 0;
	let shownAt: Array<{ revision: number; at: number }> = [];
	let renderedRevision: number | null = null;
	let readyGrace: number | undefined;
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
	const clearReadyGrace = () => {
		window.clearTimeout(readyGrace);
		readyGrace = undefined;
	};
	/** Creates the page key expected by the destination preview runtime. */
	const getPageKey = (url: string): string | null => {
		try {
			const pageUrl = new URL(url);
			pageUrl.searchParams.delete(previewQueryParams.token);
			pageUrl.searchParams.delete(previewQueryParams.context);
			return pageUrl.toString();
		} catch {
			return null;
		}
	};
	/** The URL of a page the frame navigated to, with the frame's preview parameters. */
	const getPreviewUrl = (pageKey: string, frameUrl: string): string => {
		try {
			const url = new URL(pageKey);
			const source = new URL(frameUrl);
			if (url.origin !== source.origin) return frameUrl;
			for (const name of Object.values(previewQueryParams)) {
				const value = source.searchParams.get(name);
				if (value !== null) url.searchParams.set(name, value);
			}
			return url.toString();
		} catch {
			return frameUrl;
		}
	};

	/** The frame's current URL when it shares the admin's origin. Other pages only report where they are through their runtime. */
	const getSameOriginLocation = (): string | null => {
		try {
			const href = frame?.contentWindow?.location.href;
			return href && href !== "about:blank" ? href : null;
		} catch {
			return null;
		}
	};

	/** Queues a scroll position for the next preview load. */
	const queueScrollRestore = (
		state: PreviewScrollState | null,
		targetUrl?: string,
	) => {
		clearRestoreTimeout();
		const pageKey = targetUrl ? getPageKey(targetUrl) : null;
		pendingRestore = state && pageKey ? { ...state, pageKey } : state;
		if (state) {
			restoreTimeout = window.setTimeout(() => {
				pendingRestore = null;
				restoreTimeout = undefined;
			}, RESTORE_TIMEOUT_MS);
		}
	};

	/** Requests the current scroll position from the preview iframe. */
	const captureScroll = (): Promise<PreviewScrollState | null> => {
		//* Reuse the pending position during overlapping refreshes to avoid capturing a partially loaded page.
		if (pendingRestore) return Promise.resolve(pendingRestore);

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
				createPreviewMessage({
					type: previewProtocol.messages.captureScroll,
					requestId,
				}),
				frameOrigin,
			);
		});
	};

	/** Ends typing on the page, keeping what was typed or not, eg. once the page goes. */
	const endTyping = (cancelled: boolean) => {
		const target = typing;
		if (!target) return;
		typing = null;
		options?.onInlineEnd?.(target, cancelled);
	};

	/** Marks the frame as loading a page, so updates wait for it. */
	const expectLoad = () => {
		endTyping(false);
		clearReadyGrace();
		page = { state: "loading" };
		renderedRevision = null;
		options?.onHover?.(null);
	};

	/** Reloads the page the frame shows, keeping its scroll position when its runtime reports one. */
	const reload = async () => {
		if (!frame) return;
		const hadRuntime = page.state === "ready";
		expectLoad();
		const scrollState = hadRuntime ? await captureScroll() : null;
		if (!frame) return;

		//* the frame's src stays the first page, even after its page navigates
		const url = scrollState
			? getPreviewUrl(scrollState.pageKey, frame.src)
			: (getSameOriginLocation() ?? frame.src);
		queueScrollRestore(scrollState, url);
		options?.onReload?.();
		//* assigning the same URL navigates the frame again
		frame.src = url;
	};

	/** Shows a revision: pages that re-render themselves get an update, others reload, and loading pages are waited for. */
	/** Notes a revision as written and shown, keeping the last few to match loading pages against. */
	const noteShown = (revision: number) => {
		latestRevision = revision;
		shownAt = [
			...shownAt.slice(-(SHOWN_HISTORY - 1)),
			{ revision, at: Date.now() },
		];
	};
	/** The newest revision written before a page started loading, which it shows, or null when there's none known. */
	const revisionLoadedAt = (loadedAt: number) =>
		shownAt.findLast((entry) => entry.at <= loadedAt)?.revision ?? null;

	const show = (revision: number) => {
		noteShown(revision);
		if (page.state === "loading" || typing) {
			pendingRevision = revision;
			return;
		}

		const frameOrigin = getFrameOrigin();
		const frameWindow = frame?.contentWindow;
		if (page.state === "ready" && page.updates && frameOrigin && frameWindow) {
			frameWindow.postMessage(
				createPreviewMessage({
					type: previewProtocol.messages.update,
					revision,
				}),
				frameOrigin,
			);
			return;
		}
		void reload();
	};

	/** Sends a message to a page whose runtime has connected, dropping it otherwise. */
	const postToRuntime = (
		message: Parameters<typeof createPreviewMessage>[0],
	) => {
		const frameOrigin = getFrameOrigin();
		const frameWindow = frame?.contentWindow;
		if (page.state !== "ready" || !frameOrigin || !frameWindow) return;
		frameWindow.postMessage(createPreviewMessage(message), frameOrigin);
	};

	/** Shows the revision that arrived while the page loaded. */
	const showPending = () => {
		if (pendingRevision === null) return;
		const revision = pendingRevision;
		pendingRevision = null;
		show(revision);
	};

	/** Gives a loaded page a moment to announce its runtime before treating it as having none. */
	const onFrameLoad = () => {
		if (page.state !== "loading") return;
		clearReadyGrace();
		readyGrace = window.setTimeout(() => {
			readyGrace = undefined;
			if (page.state !== "loading") return;
			page = { state: "static" };
			showPending();
		}, READY_GRACE_MS);
	};

	/** Handles validated messages from the active preview iframe. */
	const onMessage = (event: MessageEvent<unknown>) => {
		const frameOrigin = getFrameOrigin();
		if (
			!frameOrigin ||
			event.source !== frame?.contentWindow ||
			event.origin !== frameOrigin ||
			!isPreviewChildMessage(event.data)
		) {
			return;
		}

		if (
			event.data.type === previewProtocol.messages.scrollState &&
			event.data.requestId === pendingCapture?.requestId
		) {
			clearCapture(event.data.state);
			return;
		}

		if (event.data.type === previewProtocol.messages.focusField) {
			options?.onDeselect?.();
			options?.onFocusField?.(event.data.target);
			return;
		}

		if (event.data.type === previewProtocol.messages.deselect) {
			options?.onDeselect?.();
			return;
		}

		if (event.data.type === previewProtocol.messages.navigationLocked) {
			options?.onNavigationLocked?.();
			return;
		}

		if (event.data.type === previewProtocol.messages.move) {
			options?.onMove?.(event.data.target, event.data.place, event.data.anchor);
			return;
		}

		if (event.data.type === previewProtocol.messages.edit) {
			if (editing?.editable && !typing) {
				options?.onEdit?.(event.data.target, event.data.text);
			}
			return;
		}

		if (event.data.type === previewProtocol.messages.inlineInput) {
			if (typing && isSamePreviewTarget(typing, event.data.target)) {
				options?.onInlineInput?.(event.data.target, event.data.value);
			}
			return;
		}

		if (event.data.type === previewProtocol.messages.inlineEnd) {
			if (!typing || !isSamePreviewTarget(typing, event.data.target)) return;
			endTyping(event.data.cancelled);
			showPending();
			return;
		}

		if (event.data.type === previewProtocol.messages.hover) {
			if (editing) options?.onHover?.(event.data.hover);
			return;
		}

		if (event.data.type === previewProtocol.messages.unload) {
			expectLoad();
			return;
		}

		if (event.data.type === previewProtocol.messages.rendered) {
			if (page.state !== "ready") return;
			renderedRevision = event.data.revision;
			options?.onRendered?.();
			return;
		}

		if (event.data.type === previewProtocol.messages.ready) {
			clearReadyGrace();
			//* a page that just loaded, by navigating or from the back/forward cache, shows what was written before it started loading. Later readies only say whether it re-renders itself.
			const loaded = page.state !== "ready";
			if (loaded) renderedRevision = revisionLoadedAt(event.data.loadedAt);
			page = { state: "ready", updates: event.data.updates };
			frame?.contentWindow?.postMessage(
				createPreviewMessage({ type: previewProtocol.messages.connect }),
				event.origin,
			);
			if (pendingRestore) {
				frame?.contentWindow?.postMessage(
					createPreviewMessage({
						type: previewProtocol.messages.restoreScroll,
						state: pendingRestore,
					}),
					event.origin,
				);
				queueScrollRestore(null);
			}
			//* each page starts without edit mode
			if (editing) {
				postToRuntime({ type: previewProtocol.messages.editMode, editing });
			}
			if (dragged) {
				postToRuntime({ type: previewProtocol.messages.dragged, ...dragged });
			}
			//* pages that loaded before the latest revision are brought up to date
			if (
				loaded &&
				pendingRevision === null &&
				renderedRevision !== latestRevision
			) {
				show(latestRevision);
			} else {
				showPending();
			}
			options?.onRendered?.();
		}
	};

	window.addEventListener("message", onMessage);

	return {
		/** Sets the iframe used by the bridge. */
		setFrame: (element: HTMLIFrameElement) => {
			frame?.removeEventListener("load", onFrameLoad);
			frame = element;
			frame.addEventListener("load", onFrameLoad);
		},
		captureScroll,
		queueScrollRestore,
		show,
		/** Turns edit mode on for a document, or off with null, now and on every page the frame loads. */
		setEditing: (next: PreviewEditing | null) => {
			editing = next;
			postToRuntime({ type: previewProtocol.messages.editMode, editing });
			if (!next) options?.onHover?.(null);
		},
		/** Points out a field or brick on the page, if its runtime is connected. */
		highlight: (target: PreviewFieldTarget) => {
			postToRuntime({ type: previewProtocol.messages.highlightField, target });
		},
		/** Shows a fields-column drag in the preview; null ends it. */
		setDragged: (next: PreviewDragged | null) => {
			dragged = next;
			postToRuntime({
				type: previewProtocol.messages.dragged,
				target: next?.target ?? null,
				landing: next?.landing ?? null,
			});
		},
		/** Tells the page the builder is zooming it out or back in, so it keeps what's dragged or selected in place. */
		setZooming: (zooming: boolean) => {
			postToRuntime({ type: previewProtocol.messages.zoom, zooming });
		},
		/** Asks the page to edit its selected field, as clicking it again would. */
		editSelected: (target: PreviewFieldTarget) => {
			postToRuntime({ type: previewProtocol.messages.editSelected, target });
		},
		/**
		 * Starts typing a field's text where the page shows it, holding updates until it ends.
		 * Returns false when the page's runtime isn't there to do it.
		 */
		startInline: (
			target: PreviewFieldTarget,
			props: { multiline: boolean; clear: boolean },
		) => {
			if (page.state !== "ready" || typing) return false;
			typing = target;
			//* keys go to the page, eg. when typing was started from the builder's controls
			frame?.focus({ preventScroll: true });
			postToRuntime({
				type: previewProtocol.messages.inlineStart,
				target,
				...props,
			});
			return true;
		},
		/** Drags a brick or item to a point in the page's viewport, which shows where it would land. */
		drag: (target: PreviewFieldTarget, point: { x: number; y: number }) => {
			postToRuntime({ type: previewProtocol.messages.drag, target, ...point });
		},
		/** Ends a drag, moving what was dragged when `drop` is true. */
		endDrag: (drop: boolean) => {
			postToRuntime({ type: previewProtocol.messages.dragEnd, drop });
		},
		/** Prepares for the frame loading a new preview URL at `revision`, dropping updates meant for the old one. */
		expectLoad: (revision: number) => {
			pendingRevision = null;
			shownAt = [];
			noteShown(revision);
			expectLoad();
		},
		/** Whether the page has shown `revision`, so what's on it matches what was written then. */
		isShowing: (revision: number) =>
			page.state === "ready" && renderedRevision === revision,
		/** Removes listeners, timeouts, and iframe references. */
		cleanup: () => {
			endTyping(false);
			window.removeEventListener("message", onMessage);
			frame?.removeEventListener("load", onFrameLoad);
			clearCapture();
			clearReadyGrace();
			queueScrollRestore(null);
			pendingRevision = null;
			frame = null;
		},
	};
};
