// @vitest-environment happy-dom

import { encodePreviewFieldTarget } from "@lucidcms/preview-protocol";
import { afterEach, describe, expect, test, vi } from "vitest";
import { installPreviewFieldInteraction } from "./field-target.js";

const target = {
	collectionKey: "page",
	documentId: 42,
	path: ["sections", 1, "heading"],
};

afterEach(() => {
	document.body.replaceChildren();
});

describe("preview field interaction", () => {
	test("leaves ordinary clicks unchanged", () => {
		const sendTarget = vi.fn(() => true);
		const cleanup = installPreviewFieldInteraction({
			targetWindow: window,
			isConnected: () => true,
			sendTarget,
		});
		const link = document.createElement("a");
		link.href = "/next";
		link.setAttribute(
			"data-lucid-preview-field",
			encodePreviewFieldTarget(target) ?? "",
		);
		document.body.append(link);

		const event = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
		});
		link.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(false);
		expect(sendTarget).not.toHaveBeenCalled();
		cleanup();
	});

	test("finds the nearest annotated ancestor and suppresses a connected Alt-click", () => {
		const sendTarget = vi.fn(() => true);
		const bubbled = vi.fn();
		const laterCaptureListener = vi.fn();
		const cleanup = installPreviewFieldInteraction({
			targetWindow: window,
			isConnected: () => true,
			sendTarget,
		});
		const link = document.createElement("a");
		const child = document.createElement("span");
		link.href = "/next";
		link.setAttribute(
			"data-lucid-preview-field",
			encodePreviewFieldTarget(target) ?? "",
		);
		child.setAttribute("data-lucid-preview-field", "1:not-json");
		link.append(child);
		document.body.append(link);
		document.body.addEventListener("click", bubbled);
		document.addEventListener("click", laterCaptureListener, true);

		const event = new MouseEvent("click", {
			altKey: true,
			bubbles: true,
			cancelable: true,
			button: 0,
			composed: true,
		});
		child.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(bubbled).not.toHaveBeenCalled();
		expect(laterCaptureListener).not.toHaveBeenCalled();
		expect(sendTarget).toHaveBeenCalledWith(target);
		cleanup();
		document.body.removeEventListener("click", bubbled);
		document.removeEventListener("click", laterCaptureListener, true);
	});

	test("ignores malformed attributes and no-ops until connected", () => {
		const sendTarget = vi.fn(() => false);
		const cleanup = installPreviewFieldInteraction({
			targetWindow: window,
			isConnected: () => false,
			sendTarget,
		});
		const malformed = document.createElement("button");
		malformed.setAttribute("data-lucid-preview-field", "1:not-json");
		const valid = document.createElement("button");
		valid.setAttribute(
			"data-lucid-preview-field",
			encodePreviewFieldTarget(target) ?? "",
		);
		document.body.append(malformed, valid);

		const malformedEvent = new MouseEvent("click", {
			altKey: true,
			bubbles: true,
			cancelable: true,
			button: 0,
		});
		malformed.dispatchEvent(malformedEvent);
		expect(malformedEvent.defaultPrevented).toBe(false);
		expect(sendTarget).not.toHaveBeenCalled();

		const standaloneEvent = new MouseEvent("click", {
			altKey: true,
			bubbles: true,
			cancelable: true,
			button: 0,
		});
		valid.dispatchEvent(standaloneEvent);
		expect(standaloneEvent.defaultPrevented).toBe(false);
		expect(sendTarget).toHaveBeenCalledWith(target);

		cleanup();
		sendTarget.mockClear();
		valid.dispatchEvent(
			new MouseEvent("click", {
				altKey: true,
				bubbles: true,
				cancelable: true,
				button: 0,
			}),
		);
		expect(sendTarget).not.toHaveBeenCalled();
	});

	test("shows valid targets only while Alt is held in a connected preview", () => {
		let connected = false;
		const cleanup = installPreviewFieldInteraction({
			targetWindow: window,
			isConnected: () => connected,
			sendTarget: () => true,
		});
		const valid = document.createElement("h2");
		const malformed = document.createElement("p");
		valid.setAttribute(
			"data-lucid-preview-field",
			encodePreviewFieldTarget(target) ?? "",
		);
		malformed.setAttribute("data-lucid-preview-field", "1:not-json");
		document.body.append(valid, malformed);

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		expect(valid.hasAttribute("data-lucid-preview-target-hint")).toBe(false);

		connected = true;
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		expect(valid.hasAttribute("data-lucid-preview-target-hint")).toBe(true);
		expect(malformed.hasAttribute("data-lucid-preview-target-hint")).toBe(
			false,
		);

		window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt" }));
		expect(valid.hasAttribute("data-lucid-preview-target-hint")).toBe(false);
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		window.dispatchEvent(new Event("blur"));
		expect(valid.hasAttribute("data-lucid-preview-target-hint")).toBe(false);
		cleanup();
		expect(
			document.querySelector("[data-lucid-preview-field-hint-styles]"),
		).toBeNull();
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		expect(valid.hasAttribute("data-lucid-preview-target-hint")).toBe(false);
	});
});
