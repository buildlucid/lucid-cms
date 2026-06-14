import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderOwnership from "./checks/check-folder-ownership.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	number
> = async (context, data) => {
	const MediaFolders = new MediaFoldersRepository(
		context.db.client,
		context.config.db,
	);

	const folderAccessRes = await checkFolderOwnership(context, {
		folderId: data.id,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const deleteMediaFolderRes = await MediaFolders.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
			{
				key: "tenant_key",
				operator: "=",
				value: context.request.tenantKey ?? null,
				condition: context.request.tenantKey != null,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteMediaFolderRes.error) return deleteMediaFolderRes;

	return {
		error: undefined,
		data: deleteMediaFolderRes.data.id,
	};
};

export default deleteSingle;
