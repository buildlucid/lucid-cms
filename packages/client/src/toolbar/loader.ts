import type { PreviewRuntimeState } from "@lucidcms/types";
import {
	getWindow,
	isLucidBuilderPreview,
	previewQueryParam,
} from "../utils/preview.js";
import { resolveToolbarAuthentication } from "./authentication.js";
import { defaultEditLabel } from "./constants.js";
import {
	cleanPreviewUrl,
	clearStoredPreview,
	isCrossOriginEmbedded,
	storePreview,
	stripPreviewQuery,
} from "./context.js";
import { getToolbarAdminUrl, resolveToolbarHost } from "./host.js";
import { buildToolbarEditHref } from "./links.js";
import { resolveBrowserPreview } from "./preview-resolution.js";
import type { ToolbarRuntime, ToolbarRuntimeModel } from "./runtime.js";
import type {
	ToolbarController,
	ToolbarDocument,
	ToolbarOptions,
	ToolbarUpdate,
} from "./types.js";

const activeToolbarCleanups = new WeakMap<Window, () => void>();
const publishedPreview = { kind: "published" } satisfies PreviewRuntimeState;

const inactiveController = (): ToolbarController => ({
	active: false,
	preview: publishedPreview,
	ready: Promise.resolve(),
	update: async () => undefined,
	exitPreview: async () => undefined,
	cleanup: () => undefined,
});

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

/** Initializes one long-lived toolbar controller for the current window. */
export const setupToolbar = (
	options: ToolbarOptions = {},
): ToolbarController => {
	const targetWindow = getWindow();
	if (!targetWindow || isLucidBuilderPreview(targetWindow)) {
		return inactiveController();
	}

	activeToolbarCleanups.get(targetWindow)?.();
	const host = resolveToolbarHost(targetWindow, options.host);
	const adminHref = getToolbarAdminUrl(host).toString();
	let document: ToolbarDocument | null = options.document ?? null;
	let editLabel = options.editLabel?.trim() || defaultEditLabel;
	let previewPolicy = options.preview ?? "auto";
	let previewState: PreviewRuntimeState = publishedPreview;
	let runtime: ToolbarRuntime | null = null;
	let runtimeModel: ToolbarRuntimeModel | null = null;
	let cleanedUp = false;
	let exiting = false;
	let revision = 0;
	let previewAbortController: AbortController | null = null;

	const reportError = (
		kind: "authentication" | "preview" | "runtime",
		cause: unknown,
	) => {
		options.onError?.({ kind, cause });
	};

	const clearActiveCleanup = () => {
		if (activeToolbarCleanups.get(targetWindow) === cleanup) {
			activeToolbarCleanups.delete(targetWindow);
		}
	};

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		previewAbortController?.abort();
		runtime?.cleanup();
		clearActiveCleanup();
	};

	const render = async (
		model: ToolbarRuntimeModel,
		expectedRevision = revision,
	) => {
		const shouldLoad =
			model.preview.kind === "preview" ||
			model.edit !== null ||
			runtime !== null;
		if (!shouldLoad) return;

		if (!runtime) {
			try {
				const module = await import("./runtime.js");
				if (cleanedUp || expectedRevision !== revision) return;
				runtime ??= module.setupToolbarRuntime(targetWindow);
			} catch (error) {
				reportError("runtime", error);
				return;
			}
		}
		if (cleanedUp || expectedRevision !== revision) return;
		runtimeModel = model;
		runtime.update(model);
	};

	const resolvePreview = async (
		url: URL,
		signal: AbortSignal,
	): Promise<PreviewRuntimeState> => {
		if (previewPolicy !== "auto") return previewPolicy;
		try {
			return await resolveBrowserPreview({
				targetWindow,
				host,
				url,
				signal,
			});
		} catch (error) {
			if (!signal.aborted) reportError("preview", error);
			return publishedPreview;
		}
	};

	const reconcile = async (url: URL): Promise<void> => {
		const currentRevision = ++revision;
		previewAbortController?.abort();
		previewAbortController = new AbortController();
		const signal = previewAbortController.signal;
		const editHref = document ? buildToolbarEditHref(document, host) : null;
		const authentication = editHref
			? resolveToolbarAuthentication(
					targetWindow,
					host,
					options.authentication,
				).catch((error) => {
					reportError("authentication", error);
					return false;
				})
			: Promise.resolve(false);

		const [preview, authenticated] = await Promise.all([
			resolvePreview(url, signal),
			authentication,
		]);
		if (cleanedUp || signal.aborted || currentRevision !== revision) return;

		previewState = preview;
		if (preview.kind === "preview") {
			if (preview.mode === "perspective") {
				storePreview(targetWindow, host, preview);
			} else {
				clearStoredPreview(targetWindow, host);
			}
			const shouldStripToken =
				options.previewNavigation?.stripTokenFromUrl ??
				(preview.mode === "perspective" &&
					!isCrossOriginEmbedded(targetWindow));
			if (
				shouldStripToken &&
				new URL(targetWindow.location.href).searchParams.get(
					previewQueryParam,
				) === preview.token
			) {
				stripPreviewQuery(targetWindow);
			}
		} else if (previewPolicy !== "auto") {
			clearStoredPreview(targetWindow, host);
		}

		if (
			preview.kind === "published" &&
			url.searchParams.get(previewQueryParam) === "exit" &&
			new URL(targetWindow.location.href).searchParams.get(
				previewQueryParam,
			) === "exit"
		) {
			stripPreviewQuery(targetWindow);
		}

		await render(
			{
				adminHref,
				preview,
				edit:
					authenticated && editHref
						? { href: editHref, label: editLabel }
						: null,
				propagateInternalLinks:
					preview.kind === "preview" &&
					preview.mode === "perspective" &&
					(options.previewNavigation?.propagateInternalLinks ?? true),
				exitPreview,
			},
			currentRevision,
		);
	};

	const update = async (update: ToolbarUpdate): Promise<void> => {
		if (cleanedUp) return;
		const url = new URL(
			update.url ?? targetWindow.location.href,
			targetWindow.location.href,
		);
		document = update.document;
		if (update.preview !== undefined) previewPolicy = update.preview;
		if (update.editLabel !== undefined) {
			editLabel = update.editLabel.trim() || defaultEditLabel;
		}
		await reconcile(url);
	};

	const exitPreview = async (): Promise<void> => {
		if (exiting || previewState.kind === "published") return;
		exiting = true;
		const exitRevision = ++revision;
		previewAbortController?.abort();
		try {
			await options.previewNavigation?.onExit?.();
			const exitUrl = options.previewNavigation?.exitUrl
				? new URL(options.previewNavigation.exitUrl, targetWindow.location.href)
				: cleanPreviewUrl(targetWindow);
			exitUrl.searchParams.delete(previewQueryParam);
			if (exitUrl.origin === targetWindow.location.origin) {
				exitUrl.searchParams.set(previewQueryParam, "exit");
			}

			clearStoredPreview(targetWindow, host);
			previewPolicy = publishedPreview;
			previewState = publishedPreview;
			if (runtimeModel) {
				await render(
					{ ...runtimeModel, preview: publishedPreview },
					exitRevision,
				);
			}

			if (options.previewNavigation?.navigate) {
				await options.previewNavigation.navigate(exitUrl);
			} else {
				navigateToExitUrl(targetWindow, exitUrl);
			}
		} catch (error) {
			exiting = false;
			throw error;
		}
		exiting = false;
	};

	activeToolbarCleanups.set(targetWindow, cleanup);
	const ready = reconcile(new URL(targetWindow.location.href)).catch(
		(error) => {
			reportError("runtime", error);
		},
	);

	return {
		get active() {
			return !cleanedUp && (runtime?.active ?? false);
		},
		get preview() {
			return previewState;
		},
		ready,
		update,
		exitPreview,
		cleanup,
	};
};
