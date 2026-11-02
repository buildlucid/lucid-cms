import { MediaFoldersRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/** Returns a folder's title and its parents' titles, from the top level down. */
const getFolderPath: ServiceFn<[{ folderId: number }], string[]> = async (
	context,
	data,
) => {
	const MediaFolders = new MediaFoldersRepository(context.db);
	const breadcrumbRes = await MediaFolders.getBreadcrumb({
		folderId: data.folderId,
	});
	if (breadcrumbRes.error) return breadcrumbRes;

	const byId = new Map(breadcrumbRes.data.map((folder) => [folder.id, folder]));
	const path: string[] = [];
	let folder = byId.get(data.folderId);
	while (folder) {
		path.unshift(folder.title);
		folder =
			folder.parent_folder_id === null
				? undefined
				: byId.get(folder.parent_folder_id);
	}

	return { error: undefined, data: path };
};

export default getFolderPath;
