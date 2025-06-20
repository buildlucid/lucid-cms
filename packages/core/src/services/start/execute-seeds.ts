import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

const executeSeeds: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	const promiseRes = await Promise.all([
		context.services.seed.defaultOptions(context),
		context.services.seed.defaultRoles(context),
	]);
	for (const res of promiseRes) {
		if (res.error) return res;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default executeSeeds;
