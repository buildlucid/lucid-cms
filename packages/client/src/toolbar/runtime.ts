import { previewQueryParam } from "../utils/preview.js";
import type { ToolbarBootstrap } from "./bootstrap.js";
import { defaultEditLabel } from "./constants.js";
import {
	cleanPreviewUrl,
	clearStoredToken,
	isCrossOriginEmbedded,
	storeToken,
	stripPreviewQuery,
} from "./context.js";
import { createToolbarElement } from "./element.js";
import { installToolbarNavigation } from "./navigation.js";
import type { ToolbarController, ToolbarOptions } from "./types.js";

const navigateToExitUrl = (targetWindow: Window, exitUrl: URL): void => {
	if (exitUrl.origin === targetWindow.location.origin) {
		targetWindow.location.assign(exitUrl.toString());
		return;
	}

	const link = targetWindow.document.createElement("a");
	link.href = exitUrl.toString();
	link.rel = "noreferrer";
	link.referrerPolicy = "no-referrer";
	link.hidden = true;
	(targetWindow.document.body ?? targetWindow.document.documentElement).append(
		link,
	);
	link.click();
	link.remove();
};

/** Mounts the full toolbar UI after the lightweight entrypoint has gated it. */
export const setupToolbarRuntime = (
	options: ToolbarOptions,
	bootstrap: ToolbarBootstrap,
	editAuthentication: Promise<boolean>,
): ToolbarController => {
	const { targetWindow, context, preview, previewOptions, adminUrl, editHref } =
		bootstrap;

	if (preview.active && preview.token) {
		if (preview.mode === "perspective") {
			storeToken(targetWindow, preview.token);
		} else {
			clearStoredToken(targetWindow);
		}
		const shouldStripToken =
			previewOptions?.stripTokenFromUrl ??
			(preview.mode === "perspective" && !isCrossOriginEmbedded(targetWindow));
		if (shouldStripToken) stripPreviewQuery(targetWindow);
	}

	const element = createToolbarElement(targetWindow);
	element.hidden = !preview.active;
	let cleanedUp = false;
	let exiting = false;
	let editAuthenticated = false;
	let authenticationResolved = editHref === null;

	const cleanupNavigation = installToolbarNavigation({
		targetWindow,
		preview,
		propagateInternalLinks:
			options.preview !== false &&
			preview.mode === "perspective" &&
			(previewOptions?.propagateInternalLinks ?? true),
	});

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		cleanupNavigation();
		element.remove();
	};

	const exitPreview = async () => {
		if (exiting || !preview.active) return;
		exiting = true;
		try {
			await previewOptions?.onExit?.();
		} catch (error) {
			exiting = false;
			throw error;
		}

		clearStoredToken(targetWindow);
		cleanup();
		const exitUrl = previewOptions?.exitUrl
			? new URL(previewOptions.exitUrl, targetWindow.location.href)
			: cleanPreviewUrl(targetWindow);
		exitUrl.searchParams.delete(previewQueryParam);
		if (exitUrl.origin === targetWindow.location.origin) {
			exitUrl.searchParams.set(previewQueryParam, "exit");
		}
		navigateToExitUrl(targetWindow, exitUrl);
	};

	const render = () => {
		if (cleanedUp) return;
		element.setModel({
			adminHref: adminUrl.toString(),
			previewMode: preview.active ? preview.mode : null,
			edit:
				editAuthenticated && editHref
					? {
							href: editHref,
							label: options.edit?.label?.trim() || defaultEditLabel,
						}
					: null,
			exitPreview: preview.active ? exitPreview : null,
		});
		element.hidden = !preview.active && !editAuthenticated;
		if (element.hidden && !preview.active && authenticationResolved) {
			cleanup();
		}
	};

	render();

	const ready = editHref
		? editAuthentication
				.then((authenticated) => {
					authenticationResolved = true;
					editAuthenticated = authenticated;
					render();
				})
				.catch(() => {
					authenticationResolved = true;
					editAuthenticated = false;
					render();
				})
		: Promise.resolve();

	return {
		get active() {
			return !cleanedUp && element.isConnected && !element.hidden;
		},
		get element() {
			return cleanedUp ? null : element;
		},
		preview,
		context,
		ready,
		exitPreview,
		cleanup,
	};
};
