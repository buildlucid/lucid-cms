import { text } from "../../libs/i18n/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	collectionServices,
	documentVersionServices,
	documentWorkflowServices,
} from "../index.js";
import createEvent from "./helpers/create-event.js";

const terminalExecutionStatuses = ["executed", "cancelled"] as const;

const execute: ServiceFn<
	[
		{
			id: number;
			userId?: number | null;
			markFailedOnError?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const operationRes = await Operations.selectSingleDetailed({
		where: [
			{
				key: "lucid_document_publish_operations.id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (operationRes.error) return operationRes;
	if (!operationRes.data) {
		return {
			error: {
				type: "basic",
				message: text.server("core.publish.operations.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const operation = operationRes.data;
	if (
		operation.status !== "approved" ||
		terminalExecutionStatuses.some(
			(status) => status === operation.execution_status,
		)
	) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	if (operation.execution_status === "executing") {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const actorUserId =
		data.userId ?? operation.decided_by ?? operation.requested_by ?? null;
	if (actorUserId === null) {
		return {
			error: {
				type: "basic",
				message: text.server("core.publish.operations.execution.user.missing"),
				status: 400,
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();
	const markExecutingRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operation.id }],
		data: {
			execution_status: "executing",
			execution_error_message: null,
			execution_error_data: null,
			failed_at: null,
			updated_at: now,
		},
	});
	if (markExecutingRes.error) return markExecutingRes;

	const executingEventRes = await createEvent(context, {
		operation,
		event: {
			type: "executing",
			userId: actorUserId,
			comment: null,
			metadata: {},
		},
	});
	if (executingEventRes.error) return executingEventRes;

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operation.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const targetIsEnvironment =
		collectionRes.data.getData.config.environments.some(
			(environment) => environment.key === operation.target,
		);
	if (!targetIsEnvironment) {
		return {
			error: {
				type: "basic",
				message: text.server("core.publish.requests.target.not.enabled"),
				status: 400,
			},
			data: undefined,
		};
	}

	const workflowPublishRes = await documentWorkflowServices.canPublishTarget(
		context,
		{
			collectionKey: operation.collection_key,
			documentId: operation.document_id,
			target: operation.target,
		},
	);
	if (workflowPublishRes.error) {
		if (data.markFailedOnError === true) {
			await Operations.updateSingle({
				where: [{ key: "id", operator: "=", value: operation.id }],
				data: {
					execution_status: "failed",
					failed_at: new Date().toISOString(),
					execution_error_message: context.translate.text(
						workflowPublishRes.error.message,
					),
					execution_error_data: {
						source: "execution",
					},
					scheduled_job_id: null,
					updated_at: new Date().toISOString(),
				},
			});
		}
		return workflowPublishRes;
	}

	const promoteRes = await documentVersionServices.promoteVersion(context, {
		fromVersionId: operation.snapshot_version_id,
		toVersionType: operation.target,
		collectionKey: operation.collection_key,
		documentId: operation.document_id,
		userId: actorUserId,
		createRevision: false,
	});
	if (promoteRes.error) {
		if (data.markFailedOnError === true) {
			await Operations.updateSingle({
				where: [{ key: "id", operator: "=", value: operation.id }],
				data: {
					execution_status: "failed",
					failed_at: new Date().toISOString(),
					execution_error_message: context.translate.text(
						promoteRes.error.message,
					),
					execution_error_data: {
						source: "execution",
					},
					scheduled_job_id: null,
					updated_at: new Date().toISOString(),
				},
			});
		}
		return promoteRes;
	}

	const executedAt = new Date().toISOString();
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operation.id }],
		data: {
			execution_status: "executed",
			executed_at: executedAt,
			execution_error_message: null,
			execution_error_data: null,
			failed_at: null,
			scheduled_job_id: null,
			updated_at: executedAt,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await createEvent(context, {
		operation,
		collectionInstance: collectionRes.data,
		event: {
			type: "executed",
			userId: actorUserId,
			comment: null,
			metadata: {
				target: operation.target,
			},
		},
	});
	if (eventRes.error) return eventRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default execute;
