import { serverText } from "../../../libs/i18n/index.js";
import getMediaAdapter from "../../../libs/media/get-adapter.js";
import type { MediaAdapterInstance } from "../../../libs/media/types.js";
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
				name: serverText("core.config.error.name"),
				message: serverText("core.media.strategy.not.configured.message"),
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
