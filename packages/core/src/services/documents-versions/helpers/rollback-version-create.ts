import type { LucidVersionTableName } from "../../../libs/db/types.js";
import logger from "../../../libs/logger/index.js";
import type { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const rollbackVersionCreate: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			newVersionId?: number;
			previousLatestId?: number;
			tableName: LucidVersionTableName;
			versions: DocumentVersionsRepository;
		},
	],
	undefined
> = async (context, data) => {
	if (context.db.client.isTransaction) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	let newVersionCleanupFailed = false;
	let latestRestoreFailed = false;
	let rollbackError: LucidErrorData | undefined;

	if (data.newVersionId === undefined) {
		const deleteNewVersionRes = await data.versions.deleteSingle(
			{
				where: [
					{
						key: "document_id",
						operator: "=",
						value: data.documentId,
					},
					{
						key: "type",
						operator: "=",
						value: "latest",
					},
				],
			},
			{
				tableName: data.tableName,
			},
		);
		newVersionCleanupFailed = deleteNewVersionRes.error !== undefined;
		rollbackError = deleteNewVersionRes.error;
	}

	if (data.previousLatestId !== undefined) {
		const restorePreviousRes = await data.versions.updateSingle(
			{
				where: [
					{
						key: "id",
						operator: "=",
						value: data.previousLatestId,
					},
				],
				data: {
					type: "latest",
				},
			},
			{
				tableName: data.tableName,
			},
		);
		latestRestoreFailed = restorePreviousRes.error !== undefined;
		rollbackError ??= restorePreviousRes.error;
	}

	if (data.newVersionId !== undefined && !latestRestoreFailed) {
		const deleteNewVersionRes = await data.versions.deleteSingle(
			{
				where: [
					{
						key: "id",
						operator: "=",
						value: data.newVersionId,
					},
				],
			},
			{
				tableName: data.tableName,
			},
		);
		newVersionCleanupFailed = deleteNewVersionRes.error !== undefined;
		rollbackError ??= deleteNewVersionRes.error;
	}

	if (newVersionCleanupFailed || latestRestoreFailed) {
		logger.error({
			message: "Failed to roll back document version creation",
			data: {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				newVersionId: data.newVersionId,
				previousLatestId: data.previousLatestId,
				newVersionCleanupFailed,
				latestRestoreFailed,
			},
		});
	}

	if (rollbackError) {
		return {
			error: rollbackError,
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default rollbackVersionCreate;
