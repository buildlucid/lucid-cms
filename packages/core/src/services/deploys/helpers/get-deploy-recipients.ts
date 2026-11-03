import type { DeployDefinition } from "../../../libs/deploys/types.js";
import { getDeployPermission } from "../../../libs/permission/deploy-permissions.js";
import type { DeployPermissionAction } from "../../../libs/permission/types.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Resolves notification recipients by deploy permission. */
const getDeployRecipients: ServiceFn<
	[{ deploy: DeployDefinition; action: DeployPermissionAction }],
	number[]
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	return Users.selectIdsWithPermission({
		permission: getDeployPermission(data.deploy.key, data.action),
	});
};

export default getDeployRecipients;
