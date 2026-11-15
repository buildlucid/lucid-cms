import type { NotificationReceivable } from "../../../libs/notifications/types.js";
import { getDeployPermission } from "../../../libs/permission/deploy-permissions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { DeployPermissionAction } from "../../../libs/permission/types.js";

/** People who hold the action on any deploy, matching who each deploy notice goes to. */
export const receivesDeploys =
	(action: DeployPermissionAction): NotificationReceivable =>
	({ user, config }) =>
		config.deploys.some((deploy) =>
			hasPermission(user, getDeployPermission(deploy.key, action)),
		);
