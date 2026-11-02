import { MediaFoldersRepository } from "../../../../libs/repositories/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import createFolder from "../../../media-folders/create-single.js";

/** Finds the folder at a path of titles, creating any levels this site doesn't have. Returns null for the top level. */
const resolveTransferFolder: ServiceFn<
	[{ path: string[]; userId: number | null }],
	number | null
> = async (context, data) => {
	const MediaFolders = new MediaFoldersRepository(context.db);

	const selectFolder = (title: string, parentId: number | null) =>
		MediaFolders.selectSingle({
			select: ["id"],
			where: [
				{ key: "title", operator: "=", value: title },
				parentId === null
					? { key: "parent_folder_id", operator: "is", value: null }
					: { key: "parent_folder_id", operator: "=", value: parentId },
			],
		});

	let parentId: number | null = null;
	for (const title of data.path) {
		const folderRes = await selectFolder(title, parentId);
		if (folderRes.error) return folderRes;
		if (folderRes.data) {
			parentId = folderRes.data.id;
			continue;
		}

		const createdRes = await serviceWrapper(createFolder, {
			transaction: true,
		})(context, { title, parentFolderId: parentId, userId: data.userId });
		if (createdRes.error) return createdRes;

		parentId = createdRes.data;
	}

	return { error: undefined, data: parentId };
};

export default resolveTransferFolder;
