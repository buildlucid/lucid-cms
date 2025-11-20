import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			title: string;
			parentFolderId?: number | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

	const newMediaFolderRes = await MediaFolders.createSingle({
		data: {
			title: data.title,
			parent_folder_id: data.parentFolderId,
			created_by: data.userId,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newMediaFolderRes.error) return newMediaFolderRes;

	return {
		error: undefined,
		data: newMediaFolderRes.data.id,
	};
};

export default createSingle;
