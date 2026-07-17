// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { installPreviewNavigation } from "./navigation.js";

const setupScopedNavigation = () => {
	const anchor = document.createElement("a");
	anchor.href = "https://example.com/destination";
	anchor.textContent = "Destination";
	document.body.append(anchor);

	const openedWindow = { opener: window } as unknown as Window;
	const open = vi.spyOn(window, "open").mockReturnValue(openedWindow);
	const showNavigationLocked = vi.fn();
	const cleanup = installPreviewNavigation({
		targetWindow: window,
		mode: "scoped",
		token: "preview-token",
		showNavigationLocked,
	});

	return { anchor, cleanup, open, showNavigationLocked };
};

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("scoped preview link navigation", () => {
	test.each([
		{ name: "Command-click", event: "click", init: { metaKey: true } },
		{ name: "Ctrl-click", event: "click", init: { ctrlKey: true } },
		{ name: "middle-click", event: "auxclick", init: { button: 1 } },
	])("opens a published link for $name", ({ event, init }) => {
		const state = setupScopedNavigation();
		const mouseEvent = new MouseEvent(event, {
			bubbles: true,
			cancelable: true,
			...init,
		});

		state.anchor.dispatchEvent(mouseEvent);

		expect(mouseEvent.defaultPrevented).toBe(true);
		expect(state.open).toHaveBeenCalledWith(
			"https://example.com/destination",
			"_blank",
			"noopener,noreferrer",
		);
		expect(state.showNavigationLocked).not.toHaveBeenCalled();
		state.cleanup();
	});

	test.each([
		{ name: "a normal click", init: {} },
		{ name: "Option/Alt-click", init: { altKey: true } },
		{ name: "Shift-click", init: { shiftKey: true } },
	])("keeps $name inside the scoped preview", ({ init }) => {
		const state = setupScopedNavigation();
		const mouseEvent = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			...init,
		});

		state.anchor.dispatchEvent(mouseEvent);

		expect(mouseEvent.defaultPrevented).toBe(true);
		expect(state.open).not.toHaveBeenCalled();
		expect(state.showNavigationLocked).toHaveBeenCalledOnce();
		state.cleanup();
	});
});

describe("perspective preview link navigation", () => {
	test("carries the preview token and builder context to same-origin links", () => {
		const anchor = document.createElement("a");
		anchor.href = "/destination?existing=value";
		document.body.append(anchor);
		const cleanup = installPreviewNavigation({
			targetWindow: window,
			mode: "perspective",
			token: "preview-token",
			showNavigationLocked: vi.fn(),
		});

		anchor.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true }),
		);

		const destination = new URL(anchor.href);
		expect(destination.searchParams.get("existing")).toBe("value");
		expect(destination.searchParams.get("preview")).toBe("preview-token");
		expect(destination.searchParams.get("previewContext")).toBe("builder");
		cleanup();
	});

	test("removes preview credentials from external links", () => {
		const anchor = document.createElement("a");
		anchor.href =
			"https://external.example/destination?preview=token&previewContext=builder";
		document.body.append(anchor);
		const cleanup = installPreviewNavigation({
			targetWindow: window,
			mode: "perspective",
			token: "preview-token",
			showNavigationLocked: vi.fn(),
		});

		anchor.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true }),
		);

		const destination = new URL(anchor.href);
		expect(destination.searchParams.has("preview")).toBe(false);
		expect(destination.searchParams.has("previewContext")).toBe(false);
		cleanup();
	});
});
