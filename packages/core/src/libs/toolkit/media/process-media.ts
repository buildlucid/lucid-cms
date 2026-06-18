import type { MediaProcessOptions } from "@lucidcms/types";
import { mediaServices } from "../../../services/index.js";
import type { MediaUrl } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitTenantOptions } from "../types.js";
import {
	normalizeQuery,
	runToolkitService,
	withToolkitTenant,
} from "../utils.js";

export type ToolkitMediaProcessInput = ToolkitTenantOptions & {
	key: string;
	body?: MediaProcessOptions;
};

const processMedia = async (
	context: ServiceContext,
	input: ToolkitMediaProcessInput,
): ServiceResponse<MediaUrl> =>
	runToolkitService(
		() =>
			mediaServices.client.processMedia(withToolkitTenant(context, input), {
				key: input.key,
				body: normalizeQuery(input.body),
			}),
		{
			name: {
				key: "core.toolkit.media.process.error.name",
				defaultMessage: "Media Toolkit Error",
			},
			message: {
				key: "core.toolkit.media.process.error.message",
				defaultMessage: "Lucid toolkit could not process media.",
			},
		},
	);

export default processMedia;
