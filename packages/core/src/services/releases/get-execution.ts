import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ReleaseExecution } from "../../types/response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getListAccess from "./helpers/get-list-access.js";
import recordFailure from "./helpers/record-failure.js";

/**
 * Gets the current publication attempt for polling, without loading content
 * or activity. Null when there is no attempt or its job history has expired.
 */
const getExecution: ServiceFn<
	[{ id: number; user: LucidUser }],
	ReleaseExecution | null
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);

	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [Permissions.ReleasesRead],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const executionRes = await Releases.selectExecution({
		id: data.id,
		access: getListAccess(context, data.user),
	});
	if (executionRes.error) return executionRes;

	const execution = executionRes.data;
	if (!execution) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	//* a worker can stop after marking its job failed but before the failure hook runs
	if (
		execution.job_id &&
		(execution.status === "failed" || execution.status === "cancelled") &&
		execution.failure === null
	) {
		const failureRes = await serviceWrapper(recordFailure, {
			transaction: true,
		})(context, {
			id: data.id,
			jobId: execution.job_id,
			revision: execution.revision,
			userId: execution.created_by_user_id,
			message:
				execution.error_message ??
				context.translate.english(copy("server:core.releases.failed")),
		});
		if (failureRes.error) return failureRes;
	}

	return {
		error: undefined,
		data:
			execution.job_id && execution.status
				? {
						jobId: execution.job_id,
						status: execution.status,
						runAt: formatter.formatDate(execution.available_at),
						error: execution.error_message,
					}
				: null,
	};
};

export default getExecution;
