import type { PreviewUpdateHandler } from "@lucidcms/types";
import {
	createPreviewMessage,
	handlePreviewMessage,
	isPreviewBuilderMessage,
	type PreviewBuilderMessages,
	type PreviewMessageHandlers,
	type PreviewMessagePayload,
	type PreviewPageMessages,
	type PreviewScrollState,
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
	const send = (message: PreviewMessagePayload<PreviewPageMessages>) => {
		if (parentOrigin === null) return false;
		targetWindow.parent.postMessage(
			createPreviewMessage(message),
			parentOrigin,
		);
		return true;
	};
	const updates = createPreviewUpdates(targetWindow, handlers, () =>
		editing.settle(),
	);

	const announce = () => {
		targetWindow.parent.postMessage(
			createPreviewMessage({
				type: "ready",
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
			createPreviewMessage({ type: "unload" }),
			parentOrigin,
		);
	};
	//* pages restored from the back/forward cache announce themselves again
	const onPageShow = (event: PageTransitionEvent) => {
		if (!event.persisted || !unloaded) return;
		unloaded = false;
		announce();
	};

	const messageHandlers: PreviewMessageHandlers<PreviewBuilderMessages> = {
		connect: () => undefined,
		captureScroll: (message) => {
			const pending = scrollRestoration.pending();
			send({
				type: "scrollState",
				requestId: message.requestId,
				state: {
					pageKey: getPreviewPageKey(targetWindow),
					x: pending?.x ?? targetWindow.scrollX,
					y: pending?.y ?? targetWindow.scrollY,
				},
			});
		},
		restoreScroll: (message) => {
			if (message.state.pageKey === getPreviewPageKey(targetWindow)) {
				scrollRestoration.restore(message.state);
			}
		},
		update: (message) => updates.receive(message.revision),
		editMode: (message) => editing.setEditing(message.editing),
		highlight: (message) => editing.highlight(message.target),
		drag: (message) => editing.drag(message.target, message.x, message.y),
		dragEnd: (message) => editing.endDrag(message.drop),
		dragged: (message) => editing.showDragged(message.target, message.landing),
		zoom: (message) => editing.setZooming(message.zooming),
		editSelected: (message) => editing.editSelected(message.target),
		inlineStart: (message) =>
			editing.startInline(message.target, {
				multiline: message.multiline,
				clear: message.clear,
			}),
	};

	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== targetWindow.parent ||
			!isPreviewBuilderMessage(event.data)
		) {
			return;
		}
		if (event.data.type === "connect") {
			parentOrigin ??= event.origin;
			return;
		}
		if (event.origin !== parentOrigin) return;
		handlePreviewMessage(event.data, messageHandlers);
	};
	const editing = installPreviewEditing({
		targetWindow,
		isConnected: () => parentOrigin !== null,
		sendFocus: (target) => send({ type: "focus", target }),
		sendDeselect: () => {
			send({ type: "deselect" });
		},
		sendHover: (hover) => {
			send({ type: "hover", hover });
		},
		sendMove: (target, place, anchor) => {
			send({ type: "move", target, place, anchor });
		},
		sendEdit: (target, text) => {
			send({ type: "edit", target, text });
		},
		sendInlineInput: (target, value) => {
			send({ type: "inlineInput", target, value });
		},
		sendInlineEnd: (target, cancelled) => {
			send({ type: "inlineEnd", target, cancelled });
		},
	});

	targetWindow.addEventListener("message", onMessage);
	targetWindow.addEventListener("pagehide", sendUnload);
	targetWindow.addEventListener("pageshow", onPageShow);
	announce();

	return {
		/** Tells the builder a link was clicked, which the preview doesn't follow, so it can offer what the link goes to. */
		navigationLocked: (href: string | null) => {
			send({ type: "navigationLocked", href });
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
