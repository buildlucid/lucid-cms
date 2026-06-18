import { mediaServices } from "../../../services/index.js";
import type { Media } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitTenantOptions } from "../types.js";
import { runToolkitService, withToolkitTenant } from "../utils.js";

export type ToolkitMediaGetSingleInput = ToolkitTenantOptions & {
	id: number;
};

const getSingle = async (
	context: ServiceContext,
	input: ToolkitMediaGetSingleInput,
): ServiceResponse<Media> =>
	runToolkitService(
		() =>
			mediaServices.client.getSingle(withToolkitTenant(context, input), {
				id: input.id,
			}),
		{
			name: {
				key: "core.toolkit.media.get.single.error.name",
				defaultMessage: "Media Toolkit Error",
			},
			message: {
				key: "core.toolkit.media.get.single.error.message",
				defaultMessage: "Lucid toolkit could not fetch a media item.",
			},
		},
	);

export default getSingle;
