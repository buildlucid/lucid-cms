import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentVersionType } from "../../../types.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const validateClientVersionTarget = async (data: {
	versionType: DocumentVersionType;
	versionId?: number;
}): ServiceResponse<{ versionId?: number }> => {
	const isPinnedVersion =
		data.versionType === "revision" ||
		data.versionType ===
			constants.collectionBuilder.publishing.snapshotVersionType;

	const validVersionId =
		data.versionId !== undefined &&
		Number.isInteger(data.versionId) &&
		data.versionId > 0;

	if (isPinnedVersion && !validVersionId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.id.required.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (!isPinnedVersion && data.versionId !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.id.unsupported.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { versionId: validVersionId ? data.versionId : undefined },
	};
};

export default validateClientVersionTarget;
