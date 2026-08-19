import type { MediaResolveUrlOptions } from "@lucidcms/types";
import { mediaServices } from "../../../services/index.js";
import type { MediaUrl } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizeQuery, runToolkitService } from "../utils.js";

export type ToolkitMediaResolveUrlInput = MediaResolveUrlOptions & {
	key: string;
};

const resolveUrl = async (
	context: ServiceContext,
	input: ToolkitMediaResolveUrlInput,
): ServiceResponse<MediaUrl> =>
	runToolkitService(
		() =>
			mediaServices.content.resolveUrl(context, {
				key: input.key,
				options: normalizeQuery({
					preset: input.preset,
					format: input.format,
				}),
			}),
		{
			name: {
				key: "core.toolkit.media.resolve_url.error.name",
				defaultMessage: "Media Toolkit Error",
			},
			message: {
				key: "core.toolkit.media.resolve_url.error.message",
				defaultMessage: "Lucid toolkit could not resolve the media URL.",
			},
		},
	);

export default resolveUrl;
