import type { Media } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getSingle from "../get-single.js";

const getSingleClient: ServiceFn<
	[
		{
			id: number;
		},
	],
	Media
> = async (context, data) => getSingle(context, data);

export default getSingleClient;
