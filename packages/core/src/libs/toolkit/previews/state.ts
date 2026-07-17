import { previewSessionServices } from "../../../services/index.js";
import type { PreviewSession } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

type MaybePromise<T> = T | Promise<T>;

export type ToolkitPreviewSource = "query" | "stored" | "exit" | null;

export type ToolkitPreviewStore = {
	/** Reads the raw preview token persisted by the frontend adapter. */
	get: () => MaybePromise<string | null | undefined>;
	/** Persists a validated perspective preview until its server-issued expiry. */
	set: (preview: { token: string; expiresAt: string }) => MaybePromise<void>;
	/** Clears the frontend's persisted preview. */
	clear: () => MaybePromise<void>;
};

export type ToolkitPreviewResponseHeaders = {
	/** Sets a response header on the host framework's current response. */
	set: (name: string, value: string) => MaybePromise<void>;
};

export type ToolkitPreviewStateInput = {
	/** The current frontend request URL. */
	url: string | URL;
	/** Framework adapter for perspective-preview persistence. */
	session: ToolkitPreviewStore;
	/** Optional framework adapter used to apply preview response protections. */
	headers?: ToolkitPreviewResponseHeaders;
};

export type ToolkitPreviewState = {
	active: boolean;
	token: string | null;
	source: ToolkitPreviewSource;
	preview: PreviewSession | null;
};

const previewQueryParam = "preview";
const previewExitValue = "exit";
const previewContextQueryParam = "previewContext";
const builderPreviewContext = "builder";

const setPreviewResponseHeaders = async (
	headers?: ToolkitPreviewResponseHeaders,
) => {
	if (!headers) return;

	await Promise.all([
		headers.set("Cache-Control", "private, no-store"),
		headers.set("Pragma", "no-cache"),
		headers.set("Referrer-Policy", "no-referrer"),
	]);
};

const state = async (
	context: ServiceContext,
	input: ToolkitPreviewStateInput,
): ServiceResponse<ToolkitPreviewState> => {
	return runToolkitService<ToolkitPreviewState>(
		async () => {
			const url = new URL(input.url);
			const hasQueryValue = url.searchParams.has(previewQueryParam);
			const isBuilderPreview =
				url.searchParams.get(previewContextQueryParam) ===
				builderPreviewContext;
			const queryValue = hasQueryValue
				? (url.searchParams.get(previewQueryParam) ?? "")
				: undefined;

			if (queryValue === previewExitValue) {
				await setPreviewResponseHeaders(input.headers);
				await input.session.clear();

				return {
					error: undefined,
					data: {
						active: false,
						token: null,
						source: "exit",
						preview: null,
					},
				};
			}

			const storedToken = hasQueryValue ? undefined : await input.session.get();
			const token = queryValue ?? storedToken ?? null;
			if (token === null) {
				return {
					error: undefined,
					data: {
						active: false,
						token: null,
						source: null,
						preview: null,
					},
				};
			}

			await setPreviewResponseHeaders(input.headers);
			const previewRes = await previewSessionServices.resolve(context, {
				token,
			});
			if (previewRes.error) {
				await input.session.clear();
				return previewRes;
			}

			if (previewRes.data.mode === "scoped") {
				await input.session.clear();
			} else if (hasQueryValue && !isBuilderPreview) {
				await input.session.set({
					token,
					expiresAt: previewRes.data.expiresAt,
				});
			}

			return {
				error: undefined,
				data: {
					active: true,
					token,
					source: hasQueryValue ? "query" : "stored",
					preview: previewRes.data,
				},
			};
		},
		{
			name: {
				key: "core.toolkit.preview.resolve.error.name",
				defaultMessage: "Preview Toolkit Error",
			},
			message: {
				key: "core.toolkit.preview.resolve.error.message",
				defaultMessage: "Lucid toolkit could not handle the preview.",
			},
		},
	);
};

export default state;
