import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import type { AuthProvidersResponse } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const getProviders: ServiceFn<[], AuthProvidersResponse> = async (context) => {
	const providersRes = getAvailableProviders(context.config);

	const providers = providersRes.providers.map((p) => {
		return {
			name: p.name,
			icon: p.icon,
			type: p.type,
			key: p.key,
		};
	}) satisfies AuthProvidersResponse["providers"];

	return {
		error: undefined,
		data: {
			disablePassword: providersRes.disablePassword,
			providers: providers,
		},
	};
};

export default getProviders;
