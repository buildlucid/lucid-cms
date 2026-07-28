import type { GetMultipleQueryParams } from "../../../schemas/media.js";
import type { Media } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getMultiple from "../get-multiple.js";

const getMultipleContent: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: Media[];
		count: number;
	}
> = async (context, data) => getMultiple(context, data);

export default getMultipleContent;
