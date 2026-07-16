import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentVersionType, PreviewMode } from "../../../types.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

export const requiresPinnedPreviewVersion = (
	versionType: DocumentVersionType,
) =>
	versionType === "revision" ||
	versionType === constants.collectionBuilder.publishing.snapshotVersionType;

/** Resolves the preview mode and rejects modes unsupported by the version type. */
const resolvePreviewMode = async (data: {
	versionType: DocumentVersionType;
	mode?: PreviewMode;
}): ServiceResponse<PreviewMode> => {
	if (
		data.mode === "perspective" &&
		requiresPinnedPreviewVersion(data.versionType)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.mode.unsupported.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data:
			data.mode ??
			(requiresPinnedPreviewVersion(data.versionType)
				? "scoped"
				: "perspective"),
	};
};

export default resolvePreviewMode;
