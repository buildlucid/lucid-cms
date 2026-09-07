import type z from "zod";
import type { MediaUrl } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Storage key and optional named preset or format for media URL resolution. */
export type ToolkitMediaResolveUrlInput = z.input<typeof inputSchema>;

const resolveUrl = async (
	context: ServiceContext,
	input: ToolkitMediaResolveUrlInput,
): ServiceResponse<MediaUrl> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: resolveMediaUrl } = await import(
				"../../../../services/media/resolve-url.js"
			);

			return resolveMediaUrl(context, {
				key: data.key,
				options: {
					preset: data.preset,
					format: data.format,
				},
			});
		},
		name: {
			key: "core.toolkit.media.resolve_url.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.resolve_url.error.message",
			defaultMessage: "Lucid toolkit could not resolve the media URL.",
		},
	});

export default resolveUrl;
