import { copy } from "../../../libs/i18n/index.js";
import { MediaFoldersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms a folder belongs to the current tenant before destructive writes.
 * Tenants may update global folders, but deleting them could remove shared media.
 */
const checkFolderOwnership: ServiceFn<
	[
		{
			folderId?: number | null;
		},
	],
	undefined
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

	const folderRes = await MediaFolders.selectSingle({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.folderId,
			},
			{
				key: "tenant_key",
				operator: "=",
				value: context.request.tenantKey ?? null,
				condition: context.request.tenantKey != null,
			},
		],
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
		data: undefined,
	};
};

export default checkFolderOwnership;
