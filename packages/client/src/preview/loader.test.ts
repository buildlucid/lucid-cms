// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { previewScripts, storePreview } from "../contract.js";
import { setupPreview } from "./loader.js";

const pageScriptKey = previewScripts.page.key;
const toolbarScriptKey = previewScripts.toolbar.key;
const token = "a".repeat(43);

/** Puts the CMS's toolbar script on the page, as if it had loaded. */
const withToolbarScript = () => {
	const runtime = { setDocument: vi.fn(), exit: vi.fn(), cleanup: vi.fn() };
	const setup = vi.fn(() => runtime);
	Reflect.set(window, toolbarScriptKey, { version: 1, setup });
	return { runtime, setup };
};

/** Puts the page in the builder's preview frame, with the CMS's page script already loaded. */
const inPreviewFrame = () => {
	window.name = "lucid-preview";
	Object.defineProperty(window, "top", { value: null, configurable: true });
	const runtime = { handlersChanged: vi.fn(), cleanup: vi.fn() };
	const setup = vi.fn(() => runtime);
	Reflect.set(window, pageScriptKey, { version: 1, setup });
	return { runtime, setup };
};

afterEach(() => {
	setupPreview().cleanup();
	window.name = "";
	window.history.replaceState(null, "", "/");
	window.sessionStorage.clear();
	Reflect.deleteProperty(window, "top");
	Reflect.deleteProperty(window, pageScriptKey);
	Reflect.deleteProperty(window, toolbarScriptKey);
});

describe("setupPreview", () => {
	test("loads nothing on a page that isn't previewing or naming its document", async () => {
		const { setup } = withToolbarScript();
		const preview = setupPreview();
		await preview.ready;

		expect(setup).not.toHaveBeenCalled();
		expect(preview.active).toBe(false);
		expect(preview.token).toBeNull();
	});

	test("starts the toolbar on a shared preview, and reads its token from the URL or the stored preview", async () => {
		const { runtime, setup } = withToolbarScript();
		window.history.replaceState(null, "", `/?preview=${token}`);
		const navigate = vi.fn();
		const preview = setupPreview({ toolbar: false, navigate });
		await preview.ready;

		expect(setup).toHaveBeenCalledWith({
			host: window.location.origin,
			document: null,
			visible: false,
			navigate,
		});
		expect(preview.token).toBe(token);
		window.history.replaceState(null, "", "/about");
		storePreview(window, window.location.origin, {
			token,
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
			entry: {
				collectionKey: "page",
				documentId: 1,
				version: "latest",
				versionId: null,
			},
		});
		expect(preview.token).toBe(token);
		await preview.exit();
		expect(runtime.exit).toHaveBeenCalledOnce();
	});

	test("starts the toolbar once a document is named, for signed-in editors' edit link", async () => {
		const { runtime, setup } = withToolbarScript();
		const preview = setupPreview();
		const document = { collectionKey: "page", id: 1, version: "latest" };
		preview.setDocument(document);
		await preview.ready;

		expect(setup).toHaveBeenCalledWith(expect.objectContaining({ document }));
		preview.setDocument(null);
		expect(runtime.setDocument).toHaveBeenCalledWith(null);
	});

	test("starts the CMS's page script in the preview frame and hands it the page's handlers", async () => {
		const { runtime, setup } = inPreviewFrame();
		const preview = setupPreview({ morph: true });
		await preview.ready;

		expect(setupPreview()).toBe(preview);
		expect(setup).toHaveBeenCalledWith(
			expect.objectContaining({ morph: true }),
		);
		expect(preview.active).toBe(true);
		const remove = preview.onUpdate(() => undefined);
		remove();
		expect(runtime.handlersChanged).toHaveBeenCalledTimes(2);
		preview.cleanup();
		expect(runtime.cleanup).toHaveBeenCalledOnce();
		expect(preview.active).toBe(false);
	});
});
