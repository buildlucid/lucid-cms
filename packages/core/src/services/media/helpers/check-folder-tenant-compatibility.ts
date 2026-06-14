import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/**
 * Keeps folder moves organizational only.
 * Global folders can hold tenant media, but tenant folders cannot pull media across tenants.
 */
const checkFolderTenantCompatibility = (data: {
	folderId?: number | null;
	folderTenantKey?: string | null;
	mediaTenantKey?: string | null;
}): Awaited<ServiceResponse<undefined>> => {
	if (data.folderId === undefined || data.folderId === null) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	if (
		data.folderTenantKey === null ||
		data.folderTenantKey === data.mediaTenantKey
	) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	return {
		error: {
			type: "basic",
			status: 400,
			errors: {
				folderId: {
					code: "media_error",
					message: copy("server:core.media.folders.tenant.mismatch"),
				},
			},
		},
		data: undefined,
	};
};

export default checkFolderTenantCompatibility;
