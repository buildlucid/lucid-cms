import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitPreviewResponseHeaders,
	ToolkitPreviewState,
	ToolkitPreviewStateInput,
} from "./types.js";

export type * from "./types.js";

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
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data): ServiceResponse<ToolkitPreviewState> => {
			const { default: resolvePreviewSession } = await import(
				"../../../../services/preview-sessions/resolve.js"
			);

			const url = new URL(data.url);
			const hasQueryValue = url.searchParams.has(previewQueryParam);
			const isBuilderPreview =
				url.searchParams.get(previewContextQueryParam) ===
				builderPreviewContext;
			const queryValue = hasQueryValue
				? (url.searchParams.get(previewQueryParam) ?? "")
				: undefined;

			if (queryValue === previewExitValue) {
				await setPreviewResponseHeaders(data.headers);
				await data.session.clear();

				return {
					error: undefined,
					data: {
						kind: "published",
						source: "exit",
					},
				};
			}

			const storedToken = hasQueryValue ? undefined : await data.session.get();
			const token = queryValue ?? storedToken ?? null;
			if (token === null) {
				return {
					error: undefined,
					data: {
						kind: "published",
						source: null,
					},
				};
			}

			await setPreviewResponseHeaders(data.headers);
			const previewRes = await resolvePreviewSession(context, {
				token,
			});
			if (previewRes.error) {
				await data.session.clear();
				return previewRes;
			}

			if (previewRes.data.mode === "scoped") {
				await data.session.clear();
			} else if (hasQueryValue && !isBuilderPreview) {
				await data.session.set({
					token,
					expiresAt: previewRes.data.expiresAt,
				});
			}

			return {
				error: undefined,
				data: {
					kind: "preview",
					token,
					source: hasQueryValue ? "query" : "stored",
					mode: previewRes.data.mode,
					expiresAt: previewRes.data.expiresAt,
					entry: previewRes.data.entry,
				},
			};
		},
		name: {
			key: "core.toolkit.preview.resolve.error.name",
			defaultMessage: "Preview Toolkit Error",
		},
		message: {
			key: "core.toolkit.preview.resolve.error.message",
			defaultMessage: "Lucid toolkit could not handle the preview.",
		},
	});
};

export default state;
