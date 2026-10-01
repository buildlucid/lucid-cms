import constants from "../../../../../constants/constants.js";
import type { ServiceContext } from "../../../../../exports/types.js";
import { getMediaOwnership } from "../../../../../utils/media/index.js";
import logger from "../../../../logger/index.js";
import { MediaRepository } from "../../../../repositories/index.js";
import type { FieldRelationValidationInput } from "../../types.js";
import type { MediaValidationData } from "./types.js";

/**
 * Loads the media a field references. Only library media counts, so personal
 * and system files are reported as missing and never end up in content.
 */
const validateMediaInputData = async (
	context: ServiceContext,
	input: FieldRelationValidationInput,
): Promise<MediaValidationData[]> => {
	const mediaIds = input.default ?? [];
	if (mediaIds.length === 0) return [];

	try {
		const Media = new MediaRepository(context.db);

		const mediaRes = await Media.selectMultipleValidationData({
			ids: mediaIds,
			validation: {
				enabled: true,
			},
		});

		return mediaRes.error
			? []
			: mediaRes.data.filter(
					(media) => getMediaOwnership(media).type === "library",
				);
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: "Failed to fetch media for field validation",
		});
		return [];
	}
};

export default validateMediaInputData;
