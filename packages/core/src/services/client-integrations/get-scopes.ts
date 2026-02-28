import type { ClientScopeGroup } from "../../libs/permission/scopes.js";
import { ClientScopeGroups } from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getScopes: ServiceFn<[], ClientScopeGroup[]> = async () => {
	return {
		error: undefined,
		data: Object.values(ClientScopeGroups),
	};
};

export default getScopes;
