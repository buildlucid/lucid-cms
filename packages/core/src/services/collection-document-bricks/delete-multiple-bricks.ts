import Repository from "../../libs/repositories/index.js";
import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultipleBricks: ServiceFn<
	[
		{
			versionId: number;
			apply: {
				bricks: boolean;
				collectionFields: boolean;
			};
		},
	],
	undefined
> = async (context, data) => {
	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultipleBricks;
