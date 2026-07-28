import type { Accessor } from "solid-js";
import type { IntegrationServices } from "../../integrations";
import bindUseCreateSingle from "./useCreateSingle";
import bindUseDeleteSingle from "./useDeleteSingle";
import bindUseGetAll from "./useGetAll";
import bindUseGetScopes from "./useGetScopes";
import bindUseGetSingle from "./useGetSingle";
import bindUseRegenerateAPIKey from "./useRegenerateAPIKey";
import bindUseUpdateSingle from "./useUpdateSingle";

const createIntegrationServices = (userId: Accessor<number>) =>
	({
		useGetAll: bindUseGetAll(userId),
		useGetScopes: bindUseGetScopes(userId),
		useCreateSingle: bindUseCreateSingle(userId),
		useDeleteSingle: bindUseDeleteSingle(userId),
		useRegenerateAPIKey: bindUseRegenerateAPIKey(userId),
		useGetSingle: bindUseGetSingle(userId),
		useUpdateSingle: bindUseUpdateSingle(userId),
	}) satisfies IntegrationServices;

export default createIntegrationServices;
