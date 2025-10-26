import type { ServiceFn } from "../../../utils/services/types.js";

const samlCallback: ServiceFn<
	[
		{
			providerKey: string;
		},
	],
	undefined
> = async (context, data) => {
	return {
		error: undefined,
		data: undefined,
	};
};

export default samlCallback;
