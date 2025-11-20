import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	number
> = async (context, data) => {
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

	const deleteMediaFolderRes = await MediaFolders.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
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
