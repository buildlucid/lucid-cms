import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidActor } from "../../types/hono.js";
import { getDeployPermission } from "../permission/deploy-permissions.js";
import hasAccess from "../permission/has-access.js";
import type { DeployDefinition } from "./types.js";

export const isDeployDefinition = (value: unknown): value is DeployDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "deploy-definition";

export const getDeploy = (
	config: Pick<ResolvedLucidConfig, "deploys">,
	key: string,
) => config.deploys.find((deploy) => deploy.key === key);

/** The deploys an actor can view. The system can view every deploy. */
export const getViewableDeploys = (
	config: Pick<ResolvedLucidConfig, "deploys">,
	actor: LucidActor,
) =>
	config.deploys.filter((deploy) =>
		hasAccess({
			user: actor,
			requiredPermissions: [getDeployPermission(deploy.key, "read")],
		}),
	);
