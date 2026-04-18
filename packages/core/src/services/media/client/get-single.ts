import type { MediaResponse } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getSingle from "../get-single.js";

const getSingleClient: ServiceFn<
	[
		{
			id: number;
		},
	],
	MediaResponse
> = async (context, data) => getSingle(context, data);

export default getSingleClient;
