import { copy } from "../../../libs/i18n/index.js";
import { MediaFoldersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms a folder is visible in the current tenant scope before media is linked to it.
 * Global folders are visible to tenant requests, matching other tenant-scoped resources.
 */
const checkFolderAccess: ServiceFn<
	[
		{
			folderId?: number | null;
		},
	],
	{ id: number; tenant_key: string | null } | undefined
> = async (context, data) => {
	if (data.folderId === undefined || data.folderId === null) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const MediaFolders = new MediaFoldersRepository(
		context.db.client,
		context.config.db,
	);

	const folderRes = await MediaFolders.selectSingleById({
		id: data.folderId,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.folders.not.found.message"),
				status: 404,
			},
		},
	});
	if (folderRes.error) return folderRes;

	return {
		error: undefined,
		data: folderRes.data,
	};
};

export default checkFolderAccess;
