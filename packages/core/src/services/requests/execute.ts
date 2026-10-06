import constants from "../../constants/constants.js";
import type { CollectionTableNames } from "../../exports/types.js";
import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import {
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import invalidateContentDocumentCache from "../documents/helpers/invalidate-content-cache.js";
import notifyChange from "../documents/notify-change.js";
import validateVersionContent from "../documents-versions/helpers/validate-version-content.js";
import promoteVersion from "../documents-versions/promote-version.js";
import loadActiveUser from "../users/helpers/load-active-user.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import completeCreation from "./helpers/complete-creation.js";
import deleteVersions from "./helpers/delete-versions.js";
import RequestExecutionError from "./helpers/execution-error.js";
import getAllowedTargets from "./helpers/get-allowed-targets.js";
import getBlockers from "./helpers/get-blockers.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestState from "./helpers/get-request-state.js";
import type { RequestDocumentRecord } from "./types.js";

/**
 * Runs a queued publication. Every approved snapshot is published to its
 * targets, in target order, inside the job's transaction, so either everything
 * is completed or nothing is. Promote hooks and change notifications run once
 * every document is in place, so related documents in the request see each
 * other whatever order they were added in and dependants are told once per
 * target. Proposals are removed once completed, as their approved snapshots
 * hold the same content. A create request's document is marked as created
 * before any hooks run, so they see it like any other document.
 *
 * A stale job, eg. after the schedule moved or the approval was dismissed,
 * does nothing. Failures carry diagnostics for the job's failure hook, which
 * records them on the request after the transaction rolls back.
 */
const execute: ServiceFn<
	[{ id: number; jobId: string; revision: number; userId: number | null }],
	undefined
> = async (context, data) => {
	let failureRequestDocumentId: number | null = null;
	let failureTarget: string | null = null;

	const executeRes = await (async (): ServiceResponse<undefined> => {
		const Requests = new RequestsRepository(context.db);
		const RequestDocuments = new RequestDocumentsRepository(context.db);
		const RequestEvents = new RequestEventsRepository(context.db);

		const claimRes = await acquireRequestWrites(context, { id: data.id });
		if (claimRes.error) return claimRes;
		await using _claims = claimRes.data.claims;

		const request = claimRes.data.request;
		if (
			request.status !== "open" ||
			request.approved_revision !== request.revision ||
			request.revision !== data.revision ||
			request.execution_job_id !== data.jobId
		) {
			return { error: undefined, data: undefined };
		}

		const userRes =
			data.userId === null
				? { error: undefined, data: null }
				: await loadActiveUser(context, { id: data.userId });
		if (userRes.error) return userRes;

		const user = userRes.data;
		if (!user || !getRequestAccess(context, { request, user }).request) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.permission"),
					status: 403,
				},
				data: undefined,
			};
		}

		const stateRes = await getRequestState(context, { request });
		if (stateRes.error) return stateRes;

		const blockersRes = await getBlockers(context, {
			request,
			state: stateRes.data,
		});
		if (blockersRes.error) return blockersRes;
		if (blockersRes.data.length > 0) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.blocked"),
					status: 409,
				},
				data: undefined,
			};
		}

		const promoted: Array<{
			document: RequestDocumentRecord;
			collection: CollectionBuilder;
			target: string;
			versionId: number;
		}> = [];
		for (const document of request.documents) {
			failureRequestDocumentId = document.id;
			failureTarget = null;

			const state = stateRes.data.get(document.id);
			if (!state?.collection || document.approved_version_id === null) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.requests.not.approved"),
						status: 409,
					},
					data: undefined,
				};
			}

			const validateRes = await validateVersionContent(context, {
				collection: state.collection,
				documentId: document.document_id,
				versionId: document.approved_version_id,
				user,
			});
			if (validateRes.error) return validateRes;

			const order = getAllowedTargets({
				collection: state.collection,
				type: request.type,
				source: document.source,
			});
			const targets = document.targets.toSorted(
				(a, b) => order.indexOf(a.target) - order.indexOf(b.target),
			);
			for (const target of targets) {
				failureTarget = target.target;

				const promoteRes = await promoteVersion(context, {
					collectionKey: document.collection_key,
					documentId: document.document_id,
					fromVersionId: document.approved_version_id,
					toVersionType: target.target,
					userId: user.id,
					skipDocumentWriteClaims: true,
					requestId: request.id,
					deferEffects: true,
				});
				if (promoteRes.error) return promoteRes;

				promoted.push({
					document,
					collection: state.collection,
					target: target.target,
					versionId: promoteRes.data.versionId,
				});
			}
		}

		if (request.type === "create") {
			for (const document of request.documents) {
				failureRequestDocumentId = document.id;
				failureTarget = null;

				const createdRes = await completeCreation(context, {
					document,
					userId: user.id,
				});
				if (createdRes.error) return createdRes;
			}
		}

		const tables = new Map<string, CollectionTableNames>();
		for (const { document, collection, target, versionId } of promoted) {
			failureRequestDocumentId = document.id;
			failureTarget = target;

			let tableNames = tables.get(collection.key);
			if (!tableNames) {
				const tablesRes = await getTableNames(context, collection.key);
				if (tablesRes.error) return tablesRes;

				tableNames = tablesRes.data;
				tables.set(collection.key, tableNames);
			}

			const hookRes = await executeHooks(
				context,
				{
					service: "documents",
					event: "versionPromote",
					config: context.config,
					collectionInstance: collection,
				},
				{
					meta: {
						collection,
						collectionKey: document.collection_key,
						userId: user.id,
						collectionTableNames: tableNames,
						request: {
							id: request.id,
							documents: request.documents.flatMap((document) =>
								document.source_version_id === null
									? []
									: [
											{
												collectionKey: document.collection_key,
												documentId: document.document_id,
												source: document.source,
												versionId: document.source_version_id,
											},
										],
							),
						},
					},
					data: {
						documentId: document.document_id,
						versionId,
						versionType: target,
					},
				},
			);
			if (hookRes.error) return hookRes;
		}
		failureRequestDocumentId = null;
		failureTarget = null;

		const publishedRes = await executeHooks(
			context,
			{ service: "requests", event: "completed", config: context.config },
			{
				meta: { userId: user.id },
				data: {
					request: { id: request.id, revision: request.revision },
					documents: request.documents.map((document) => ({
						requestDocumentId: document.id,
						collectionKey: document.collection_key,
						documentId: document.document_id,
						source: document.source,
						versions: promoted
							.filter((entry) => entry.document.id === document.id)
							.map((entry) => ({
								target: entry.target,
								versionId: entry.versionId,
							})),
					})),
				},
			},
		);
		if (publishedRes.error) return publishedRes;

		//* dependants are told once per collection and target, after routes and other hooks have settled
		const changes = Map.groupBy(
			promoted,
			(entry) => `${entry.document.collection_key}:${entry.target}`,
		);
		for (const collectionKey of new Set(
			promoted.map((entry) => entry.document.collection_key),
		)) {
			await invalidateContentDocumentCache(context, collectionKey);
		}
		for (const entries of changes.values()) {
			const [first] = entries;
			if (!first) continue;
			const changed = await notifyChange(context, {
				change:
					first.target === "latest"
						? { type: "created" }
						: { type: "published", version: first.target },
				collectionKey: first.document.collection_key,
				ids: [...new Set(entries.map((entry) => entry.document.document_id))],
			});
			if (changed.error) return changed;
		}

		const now = new Date().toISOString();
		const updateRes = await Requests.updateSingle({
			data: {
				status: "completed",
				completed_at: now,
				failure: null,
				failure_request_document_id: null,
				failure_target: null,
				updated_at: now,
			},
			where: [{ key: "id", operator: "=", value: request.id }],
		});
		if (updateRes.error) return updateRes;

		const proposals = request.documents.flatMap((document) =>
			document.source === "latest" &&
			document.source_version_id !== null &&
			document.source_version_id !== document.approved_version_id
				? [{ ...document, proposalId: document.source_version_id }]
				: [],
		);
		if (proposals.length > 0) {
			const detachRes = await RequestDocuments.updateMultiple({
				data: { source_version_id: null },
				where: [
					{
						key: "id",
						operator: "in",
						value: proposals.map((document) => document.id),
					},
				],
			});
			if (detachRes.error) return detachRes;
		}

		for (const document of proposals) {
			const versionsRes = await deleteVersions(context, {
				collectionKey: document.collection_key,
				documentId: document.document_id,
				versionIds: [document.proposalId],
			});
			if (versionsRes.error) return versionsRes;
		}

		const eventsRes = await RequestEvents.createEvents({
			data: [{ request_id: request.id, user_id: user.id, type: "completed" }],
		});
		if (eventsRes.error) return eventsRes;

		return { error: undefined, data: undefined };
	})().catch((error: unknown): Awaited<ServiceResponse<undefined>> => {
		logger.error({
			message: "Request execution failed",
			error,
			scope: constants.logScopes.jobs,
			event: "requests.execute.failed",
			data: {
				requestId: data.id,
				requestDocumentId: failureRequestDocumentId,
				target: failureTarget,
			},
		});
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.failed"),
				status: 500,
			},
			data: undefined,
		};
	});
	if (!executeRes.error) return executeRes;

	return {
		error: {
			...executeRes.error,
			cause: new RequestExecutionError(failureRequestDocumentId, failureTarget),
		},
		data: undefined,
	};
};

export default execute;
