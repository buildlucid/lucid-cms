import type { GetMultipleQueryParams } from "../../../schemas/media.js";
import type { Media } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getMultiple from "../get-multiple.js";

const getMultipleClient: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
			localeCode: string;
		},
	],
	{
		data: Media[];
		count: number;
	}
> = async (context, data) => getMultiple(context, data);

export default getMultipleClient;
