import type { MediaResolveUrlOptions } from "@lucidcms/types";
import resolveMediaUrl from "../../../services/media/resolve-url.js";
import type { MediaUrl } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizeQuery, runToolkitService } from "../utils.js";

/** Storage key and optional named preset or format for media URL resolution. */
export type ToolkitMediaResolveUrlInput = MediaResolveUrlOptions & {
	/** Media storage key, including its visibility prefix. */
	key: string;
};

const resolveUrl = async (
	context: ServiceContext,
	input: ToolkitMediaResolveUrlInput,
): ServiceResponse<MediaUrl> =>
	runToolkitService({
		handler: () =>
			resolveMediaUrl(context, {
				key: input.key,
				options: normalizeQuery({
					preset: input.preset,
					format: input.format,
				}),
			}),
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
