import constants from "../../../../../constants/constants.js";
import T from "../../../../../translations/index.js";
import type { ServiceContext } from "../../../../../types.js";
import logger from "../../../../logger/index.js";
import { MediaRepository } from "../../../../repositories/index.js";
import type { FieldRelationValidationInput } from "../../types.js";
import type { MediaValidationData } from "./types.js";

/**
 * Validate media input data
 */
const validateMediaInputData = async (
	context: ServiceContext,
	input: FieldRelationValidationInput,
): Promise<MediaValidationData[]> => {
	const mediaIds = input.default ?? [];
	if (mediaIds.length === 0) return [];

	try {
		const Media = new MediaRepository(context.db.client, context.config.db);

		const mediaRes = await Media.selectMultiple({
			select: ["id", "file_extension", "width", "height", "type"],
			where: [
				{
					key: "id",
					operator: "in",
					value: mediaIds,
				},
			],
			validation: {
				enabled: true,
			},
		});

		return mediaRes.error ? [] : mediaRes.data;
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_media_for_validation"),
		});
		return [];
	}
};

export default validateMediaInputData;
