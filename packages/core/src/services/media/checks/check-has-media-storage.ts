import { copy } from "../../../libs/i18n/index.js";
import type { MediaStorageAdapterInstance } from "../../../libs/media-storage/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

const checkHasMediaStorage = async (
	context: ServiceContext,
): ServiceResponse<MediaStorageAdapterInstance> => {
	if (!context.mediaStorage) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.config.error.name"),
				message: copy(
					"server:core.media.storage.adapter.not.configured.message",
				),
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: context.mediaStorage,
	};
};

export default checkHasMediaStorage;
