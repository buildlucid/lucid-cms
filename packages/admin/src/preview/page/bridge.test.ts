// @vitest-environment happy-dom

import { encodeEditMarkup } from "@lucidcms/client/contract";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createPreviewMessage, type PreviewTarget } from "../protocol/index.js";
import { installPreviewBridge } from "./bridge.js";
import { getPreviewPageKey } from "./context.js";

const markup = (target: PreviewTarget) => encodeEditMarkup(target) ?? "";

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("preview page bridge handshake", () => {
	test.each([
		["same-origin", window.location.origin],
		["cross-origin", "https://admin.example"],
	])(
		"sends targets only after connecting to the exact %s parent",
		(_configuration, parentOrigin) => {
			const postMessage = vi
				.spyOn(window.parent, "postMessage")
				.mockImplementation(() => undefined);
			const { cleanup } = installPreviewBridge(window, () => []);
			const button = document.createElement("button");
			button.setAttribute(
				"data-lucid-edit",
				markup({ collectionKey: "page", documentId: 1, path: ["title"] }),
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
						type: "connect",
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
					type: "focus",
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

describe("preview page bridge scroll", () => {
	test("reports a restore still in progress instead of the current position", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
			() => undefined,
		);
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const { cleanup } = installPreviewBridge(window, () => []);
		const parentOrigin = "https://admin.example";
		const state = { pageKey: getPreviewPageKey(window), x: 0, y: 800 };
		for (const data of [
			createPreviewMessage({ type: "connect" }),
			createPreviewMessage({
				type: "restoreScroll",
				state,
			}),
			createPreviewMessage({
				type: "captureScroll",
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
				type: "scrollState",
				requestId: "capture-1",
				state,
			}),
			parentOrigin,
		);
		cleanup();
	});
});

describe("preview page bridge announcements", () => {
	test("says whether the page handles updates, again when that changes or its runtime is torn down", () => {
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const handlers = new Set<() => void>();
		const bridge = installPreviewBridge(window, () => [...handlers]);
		const parentOrigin = "https://admin.example";
		window.dispatchEvent(
			new MessageEvent("message", {
				source: window.parent,
				origin: parentOrigin,
				data: createPreviewMessage({ type: "connect" }),
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
					type: "ready",
					updates: false,
					loadedAt: Math.floor(performance.timeOrigin),
				}),
				"*",
			],
			[
				createPreviewMessage({
					type: "ready",
					updates: true,
					loadedAt: Math.floor(performance.timeOrigin),
				}),
				parentOrigin,
			],
			[
				createPreviewMessage({
					type: "ready",
					updates: false,
					loadedAt: Math.floor(performance.timeOrigin),
				}),
				parentOrigin,
			],
		]);
	});

	test("says when the page leaves, and announces itself again, with when it loaded, when restored from the back/forward cache", () => {
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const bridge = installPreviewBridge(window, () => []);
		window.dispatchEvent(
			new MessageEvent("message", {
				source: window.parent,
				origin: "https://admin.example",
				data: createPreviewMessage({ type: "connect" }),
			}),
		);
		//* happy-dom ignores `persisted` in PageTransitionEvent's options
		const transition = (type: string) =>
			Object.assign(new Event(type), { persisted: true });
		window.dispatchEvent(transition("pagehide"));
		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({ type: "unload" }),
			"https://admin.example",
		);
		window.dispatchEvent(transition("pageshow"));

		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({
				type: "ready",
				updates: false,
				loadedAt: Math.floor(performance.timeOrigin),
			}),
			"https://admin.example",
		);
		bridge.cleanup();
	});
});

describe("preview page bridge editing", () => {
	test("turns edit mode on only from the connected parent", () => {
		vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
		const { cleanup } = installPreviewBridge(window, () => []);
		const heading = document.createElement("h1");
		heading.setAttribute(
			"data-lucid-edit",
			markup({ collectionKey: "page", documentId: 1, path: ["title"] }),
		);
		document.body.append(heading);
		const send = (origin: string, data: unknown) =>
			window.dispatchEvent(
				new MessageEvent("message", { source: window.parent, origin, data }),
			);
		const click = () => {
			const event = new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			heading.dispatchEvent(event);
			return event.defaultPrevented;
		};
		const editMode = createPreviewMessage({
			type: "editMode",
			editing: {
				collectionKey: "page",
				documentId: 1,
				editable: false,
				repeaters: [],
				errors: [],
				theme: "dark",
			},
		});

		send("https://admin.example", createPreviewMessage({ type: "connect" }));
		send("https://other.example", editMode);
		expect(click()).toBe(false);
		send("https://admin.example", editMode);
		expect(click()).toBe(true);

		cleanup();
	});
});
