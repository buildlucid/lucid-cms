import type { PreviewUpdateHandler } from "@lucidcms/types";
import {
	createPreviewMessage,
	isPreviewParentMessage,
	type PreviewScrollState,
	previewProtocol,
} from "../protocol/index.js";
import { getPreviewPageKey } from "./context.js";
import { installPreviewEditing } from "./editing.js";
import { createPreviewUpdates } from "./updates.js";

/** Restores a scroll position once the page has loaded, retrying while late content grows the page. */
const installScrollRestoration = (targetWindow: Window) => {
	let frameId: number | undefined;
	let pendingLoad: (() => void) | undefined;
	let target: PreviewScrollState | null = null;

	const cancel = () => {
		if (frameId !== undefined) targetWindow.cancelAnimationFrame(frameId);
		if (pendingLoad) targetWindow.removeEventListener("load", pendingLoad);
		frameId = undefined;
		pendingLoad = undefined;
		target = null;
	};

	const restore = (state: PreviewScrollState) => {
		cancel();
		target = state;
		const start = () => {
			pendingLoad = undefined;
			let attempts = 0;
			const apply = () => {
				targetWindow.scrollTo(state.x, state.y);
				attempts += 1;
				if (
					attempts < 12 &&
					(Math.abs(targetWindow.scrollX - state.x) > 1 ||
						Math.abs(targetWindow.scrollY - state.y) > 1)
				) {
					frameId = targetWindow.requestAnimationFrame(apply);
				} else {
					frameId = undefined;
					target = null;
				}
			};
			frameId = targetWindow.requestAnimationFrame(apply);
		};

		if (targetWindow.document.readyState === "complete") {
			start();
		} else {
			pendingLoad = start;
			targetWindow.addEventListener("load", start, { once: true });
		}
	};

	return {
		cancel,
		restore,
		/** The position still being restored, so a capture mid-restore doesn't report the top of the page. */
		pending: () => target,
	};
};

/**
 * Installs the page-side bridge and update handlers. Reports handler availability and navigation
 * so the builder can reload or defer updates.
 */
export const installPreviewBridge = (
	targetWindow: Window,
	handlers: () => PreviewUpdateHandler[],
) => {
	const scrollRestoration = installScrollRestoration(targetWindow);
	let parentOrigin: string | null = null;
	let announcedUpdates = handlers().length > 0;
	let unloaded = false;

	/** Sends a message to the builder once it has connected. */
	const send = (message: Parameters<typeof createPreviewMessage>[0]) => {
		if (parentOrigin === null) return false;
		targetWindow.parent.postMessage(
			createPreviewMessage(message),
			parentOrigin,
		);
		return true;
	};
	const updates = createPreviewUpdates(targetWindow, handlers, (revision) => {
		editing.settle();
		send({ type: previewProtocol.messages.rendered, revision });
	});

	const announce = () => {
		targetWindow.parent.postMessage(
			createPreviewMessage({
				type: previewProtocol.messages.ready,
				updates: announcedUpdates,
				loadedAt: Math.floor(targetWindow.performance.timeOrigin),
			}),
			parentOrigin ?? "*",
		);
	};
	const sendUnload = () => {
		if (unloaded || parentOrigin === null) return;
		unloaded = true;
		targetWindow.parent.postMessage(
			createPreviewMessage({ type: previewProtocol.messages.unload }),
			parentOrigin,
		);
	};
	//* pages restored from the back/forward cache announce themselves again
	const onPageShow = (event: PageTransitionEvent) => {
		if (!event.persisted || !unloaded) return;
		unloaded = false;
		announce();
	};

	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== targetWindow.parent ||
			!isPreviewParentMessage(event.data)
		) {
			return;
		}

		if (event.data.type === previewProtocol.messages.connect) {
			if (parentOrigin === null) parentOrigin = event.origin;
			return;
		}

		if (event.origin !== parentOrigin) return;

		if (event.data.type === previewProtocol.messages.captureScroll) {
			const pending = scrollRestoration.pending();
			const state: PreviewScrollState = {
				pageKey: getPreviewPageKey(targetWindow),
				x: pending?.x ?? targetWindow.scrollX,
				y: pending?.y ?? targetWindow.scrollY,
			};
			targetWindow.parent.postMessage(
				createPreviewMessage({
					type: previewProtocol.messages.scrollState,
					requestId: event.data.requestId,
					state,
				}),
				event.origin,
			);
			return;
		}

		if (
			event.data.type === previewProtocol.messages.restoreScroll &&
			event.data.state.pageKey === getPreviewPageKey(targetWindow)
		) {
			scrollRestoration.restore(event.data.state);
			return;
		}

		if (event.data.type === previewProtocol.messages.update) {
			updates.receive(event.data.revision);
			return;
		}

		if (event.data.type === previewProtocol.messages.editMode) {
			editing.setEditing(event.data.editing);
			return;
		}

		if (event.data.type === previewProtocol.messages.highlightField) {
			editing.highlight(event.data.target);
			return;
		}

		if (event.data.type === previewProtocol.messages.drag) {
			editing.drag(event.data.target, event.data.x, event.data.y);
			return;
		}

		if (event.data.type === previewProtocol.messages.dragEnd) {
			editing.endDrag(event.data.drop);
			return;
		}

		if (event.data.type === previewProtocol.messages.dragged) {
			editing.showDragged(event.data.target, event.data.landing);
			return;
		}

		if (event.data.type === previewProtocol.messages.zoom) {
			editing.setZooming(event.data.zooming);
			return;
		}

		if (event.data.type === previewProtocol.messages.editSelected) {
			editing.editSelected(event.data.target);
			return;
		}

		if (event.data.type === previewProtocol.messages.inlineStart) {
			editing.startInline(event.data.target, {
				multiline: event.data.multiline,
				clear: event.data.clear,
			});
		}
	};
	const editing = installPreviewEditing({
		targetWindow,
		isConnected: () => parentOrigin !== null,
		sendFocus: (target) =>
			send({ type: previewProtocol.messages.focusField, target }),
		sendDeselect: () => {
			send({ type: previewProtocol.messages.deselect });
		},
		sendHover: (hover) => {
			send({ type: previewProtocol.messages.hover, hover });
		},
		sendMove: (target, place, anchor) => {
			send({ type: previewProtocol.messages.move, target, place, anchor });
		},
		sendEdit: (target, text) => {
			send({ type: previewProtocol.messages.edit, target, text });
		},
		sendInlineInput: (target, value) => {
			send({ type: previewProtocol.messages.inlineInput, target, value });
		},
		sendInlineEnd: (target, cancelled) => {
			send({ type: previewProtocol.messages.inlineEnd, target, cancelled });
		},
	});

	targetWindow.addEventListener("message", onMessage);
	targetWindow.addEventListener("pagehide", sendUnload);
	targetWindow.addEventListener("pageshow", onPageShow);
	announce();

	return {
		/** Tells the builder a link was clicked, which the preview doesn't follow, so it can say how to open it. */
		navigationLocked: () => {
			send({ type: previewProtocol.messages.navigationLocked });
		},
		/** Announces again when handlers were added to an empty set or it emptied. */
		handlersChanged: () => {
			const hasHandlers = handlers().length > 0;
			if (hasHandlers === announcedUpdates) return;
			announcedUpdates = hasHandlers;
			announce();
		},
		cleanup: () => {
			//* the page stays without its runtime, so the builder reloads it for updates instead
			if (!unloaded && parentOrigin !== null && announcedUpdates) {
				announcedUpdates = false;
				announce();
			}
			targetWindow.removeEventListener("message", onMessage);
			targetWindow.removeEventListener("pagehide", sendUnload);
			targetWindow.removeEventListener("pageshow", onPageShow);
			editing.cleanup();
			scrollRestoration.cancel();
			updates.cancel();
			parentOrigin = null;
		},
	};
};
