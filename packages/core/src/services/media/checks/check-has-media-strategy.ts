import getMediaAdapter from "../../../libs/media-adapter/get-adapter.js";
import type { MediaAdapterInstance } from "../../../libs/media-adapter/types.js";
import T from "../../../translations/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

const checkHasMediaStrategy = async (
	context: ServiceContext,
): ServiceResponse<MediaAdapterInstance> => {
	const mediaAdapter = await getMediaAdapter(context.config);

	if (!mediaAdapter.enabled) {
		return {
			error: {
				type: "basic",
				name: T("config_error_name"),
				message: T("media_strategy_not_configured_message"),
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: mediaAdapter.adapter,
	};
};

export default checkHasMediaStrategy;
