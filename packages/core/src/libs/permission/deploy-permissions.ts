import type { DeployPermission, DeployPermissionAction } from "./types.js";

/**
 * Available deploy actions.
 * @remarks `manage` enables, disables and cancels runs.
 */
export const deployPermissionActions = ["read", "run", "manage"] as const;

/** Builds a deploy permission key, eg. `deploys:production:run`. */
export const getDeployPermission = <TAction extends DeployPermissionAction>(
	deployKey: string,
	action: TAction,
): DeployPermission<TAction> => `deploys:${deployKey}:${action}`;
