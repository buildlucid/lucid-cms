import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "./checks/check-folder-access.js";

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
		context.db.client,
		context.config.db,
	);

	const parentFolderAccessRes = await checkFolderAccess(context, {
		folderId: data.parentFolderId,
	});
	if (parentFolderAccessRes.error) return parentFolderAccessRes;

	const newMediaFolderRes = await MediaFolders.createSingle({
		data: {
			title: data.title,
			tenant_key: context.request.tenantKey ?? null,
			parent_folder_id: data.parentFolderId ?? null,
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
