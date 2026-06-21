import { copy } from "../../../libs/i18n/index.js";
import type { MediaAdapterInstance } from "../../../libs/media/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

const checkHasMediaStrategy = async (
	context: ServiceContext,
): ServiceResponse<MediaAdapterInstance> => {
	if (!context.media) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.config.error.name"),
				message: copy("server:core.media.strategy.not.configured.message"),
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: context.media,
	};
};

export default checkHasMediaStrategy;
