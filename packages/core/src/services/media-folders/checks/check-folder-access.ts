import { copy } from "../../../libs/i18n/index.js";
import { MediaFoldersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms a folder exists before media is linked to it.
 */
const checkFolderAccess: ServiceFn<
	[
		{
			folderId?: number | null;
		},
	],
	{ id: number } | undefined
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
