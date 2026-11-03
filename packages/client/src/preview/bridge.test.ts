// @vitest-environment happy-dom

import {
	createPreviewMessage,
	encodePreviewFieldTarget,
	previewProtocol,
} from "@lucidcms/preview-protocol";
import { afterEach, describe, expect, test, vi } from "vitest";
import { installPreviewBridge } from "./bridge.js";
import { getPreviewPageKey } from "./context.js";

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("client preview bridge handshake", () => {
	test.each([
		["same-origin", window.location.origin],
		["cross-origin", "https://admin.example"],
	])(
		"sends targets only after connecting to the exact %s parent",
		(_configuration, parentOrigin) => {
			const postMessage = vi
				.spyOn(window.parent, "postMessage")
				.mockImplementation(() => undefined);
			const { cleanup } = installPreviewBridge(window, new Set());
			const button = document.createElement("button");
			button.setAttribute(
				"data-lucid-preview-field",
				encodePreviewFieldTarget({
					collectionKey: "page",
					documentId: 1,
					path: ["title"],
				}) ?? "",
			);
			document.body.append(button);

			const beforeConnect = new MouseEvent("click", {
				altKey: true,
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			button.dispatchEvent(beforeConnect);
			expect(beforeConnect.defaultPrevented).toBe(false);

			window.dispatchEvent(
				new MessageEvent("message", {
					source: window.parent,
					origin: parentOrigin,
					data: createPreviewMessage({
						type: previewProtocol.messages.connect,
					}),
				}),
			);
			const connectedClick = new MouseEvent("click", {
				altKey: true,
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			button.dispatchEvent(connectedClick);

			expect(connectedClick.defaultPrevented).toBe(true);
			expect(postMessage).toHaveBeenCalledWith(
				createPreviewMessage({
					type: previewProtocol.messages.focusField,
					target: { collectionKey: "page", documentId: 1, path: ["title"] },
				}),
				parentOrigin,
			);

			cleanup();
			postMessage.mockClear();
			button.dispatchEvent(
				new MouseEvent("click", {
					altKey: true,
					bubbles: true,
					cancelable: true,
					button: 0,
				}),
			);
			expect(postMessage).not.toHaveBeenCalled();
		},
	);
});

describe("client preview bridge scroll", () => {
	test("reports a restore still in progress instead of the current position", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
			() => undefined,
		);
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const { cleanup } = installPreviewBridge(window, new Set());
		const parentOrigin = "https://admin.example";
		const state = { pageKey: getPreviewPageKey(window), x: 0, y: 800 };
		for (const data of [
			createPreviewMessage({ type: previewProtocol.messages.connect }),
			createPreviewMessage({
				type: previewProtocol.messages.restoreScroll,
				state,
			}),
			createPreviewMessage({
				type: previewProtocol.messages.captureScroll,
				requestId: "capture-1",
			}),
		]) {
			window.dispatchEvent(
				new MessageEvent("message", {
					source: window.parent,
					origin: parentOrigin,
					data,
				}),
			);
		}

		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({
				type: previewProtocol.messages.scrollState,
				requestId: "capture-1",
				state,
			}),
			parentOrigin,
		);
		cleanup();
	});
});

describe("client preview bridge announcements", () => {
	test("says whether the page handles updates, again when that changes or its runtime is torn down", () => {
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const handlers = new Set<() => void>();
		const bridge = installPreviewBridge(window, handlers);
		const parentOrigin = "https://admin.example";
		window.dispatchEvent(
			new MessageEvent("message", {
				source: window.parent,
				origin: parentOrigin,
				data: createPreviewMessage({ type: previewProtocol.messages.connect }),
			}),
		);

		handlers.add(() => undefined);
		bridge.handlersChanged();
		bridge.handlersChanged();
		//* tearing down without leaving the page hands updates back to the builder
		bridge.cleanup();

		expect(postMessage.mock.calls).toEqual([
			[
				createPreviewMessage({
					type: previewProtocol.messages.ready,
					updates: false,
				}),
				"*",
			],
			[
				createPreviewMessage({
					type: previewProtocol.messages.ready,
					updates: true,
				}),
				parentOrigin,
			],
			[
				createPreviewMessage({
					type: previewProtocol.messages.ready,
					updates: false,
				}),
				parentOrigin,
			],
		]);
	});

	test("says when the page leaves, and announces itself again when restored from the back/forward cache", () => {
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const bridge = installPreviewBridge(window, new Set());
		window.dispatchEvent(
			new MessageEvent("message", {
				source: window.parent,
				origin: "https://admin.example",
				data: createPreviewMessage({ type: previewProtocol.messages.connect }),
			}),
		);
		//* happy-dom ignores `persisted` in PageTransitionEvent's options
		const transition = (type: string) =>
			Object.assign(new Event(type), { persisted: true });
		window.dispatchEvent(transition("pagehide"));
		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({ type: previewProtocol.messages.unload }),
			"https://admin.example",
		);
		window.dispatchEvent(transition("pageshow"));

		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({
				type: previewProtocol.messages.ready,
				updates: false,
			}),
			"https://admin.example",
		);
		bridge.cleanup();
	});
});
