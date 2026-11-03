import { getDeployCallbackUrl } from "../../libs/deploys/callback.js";
import { getDeploy } from "../../libs/deploys/registry.js";
import { copy } from "../../libs/i18n/index.js";
import { getDeployPermission } from "../../libs/permission/deploy-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import applyRunUpdate from "./helpers/apply-run-update.js";

/**
 * Cancels the run and frees its slot. Uses host cancellation when supported; otherwise only stops
 * waiting locally.
 * @remarks Run outside a transaction to avoid holding it open during host calls.
 */
const cancelRun: ServiceFn<
	[{ id: number; actor: LucidActor }],
	undefined
> = async (context, data) => {
	const DeployRuns = new DeployRunsRepository(context.db);

	const run = await DeployRuns.selectSingle({
		select: [
			"id",
			"deploy_key",
			"status",
			"source",
			"trigger_count",
			"external_id",
		],
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (run.error) return run;

	const deploy = run.data
		? getDeploy(context.config, run.data.deploy_key)
		: null;
	if (!run.data || !deploy) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.run.not.found"),
			},
			data: undefined,
		};
	}
	if (
		!hasAccess({
			user: data.actor,
			requiredPermissions: [getDeployPermission(deploy.key, "manage")],
		})
	) {
		return {
			error: {
				type: "authorisation",
				status: 403,
				message: copy("server:core.deploys.run.cancel.forbidden"),
			},
			data: undefined,
		};
	}

	const { status } = run.data;
	if (status !== "queued" && status !== "starting" && status !== "running") {
		return { error: undefined, data: undefined };
	}

	//* a queued run hasn't reached the host, and a starting one may not have an ID to stop yet
	const externalId = status === "queued" ? null : run.data.external_id;
	const cancel = deploy.provider.cancel;
	if (cancel && externalId !== null) {
		try {
			await cancel(context, {
				id: run.data.id,
				deployKey: deploy.key,
				source: run.data.source,
				triggerCount: run.data.trigger_count,
				callbackUrl: getDeployCallbackUrl(context, run.data.id),
				externalId,
			});
		} catch (error) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy("server:core.deploys.run.cancel.host.failed", {
						data: {
							reason: error instanceof Error ? error.message : String(error),
						},
					}),
				},
				data: undefined,
			};
		}
	}

	const runId = run.data.id;
	return withTransaction(context, (context) =>
		applyRunUpdate(context, {
			deploy,
			runId,
			update: {
				status: "cancelled",
				message: context.translate(
					status === "queued"
						? copy("server:core.deploys.run.cancelled.queued")
						: cancel && externalId !== null
							? copy("server:core.deploys.run.cancelled.host")
							: copy("server:core.deploys.run.cancelled.waiting"),
				),
			},
		}),
	);
};

export default cancelRun;
