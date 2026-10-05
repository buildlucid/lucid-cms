import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import {
	ReleaseDocumentsRepository,
	ReleaseEventsRepository,
	ReleasesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import validateVersionContent from "../documents-versions/helpers/validate-version-content.js";
import promoteVersion from "../documents-versions/promote-version.js";
import loadActiveUser from "../users/helpers/load-active-user.js";
import acquireReleaseWrites from "./helpers/acquire-release-writes.js";
import deleteVersions from "./helpers/delete-versions.js";
import ReleaseExecutionError from "./helpers/execution-error.js";
import getAllowedTargets from "./helpers/get-allowed-targets.js";
import getBlockers from "./helpers/get-blockers.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import getReleaseState from "./helpers/get-release-state.js";

/**
 * Runs a queued publication. Every approved snapshot is published to its
 * targets, in target order, inside the job's transaction, so either everything
 * is released or nothing is. Proposals are removed once released, as their
 * approved snapshots hold the same content.
 *
 * A stale job, eg. after the schedule moved or the approval was dismissed,
 * does nothing. Failures carry diagnostics for the job's failure hook, which
 * records them on the release after the transaction rolls back.
 */
const execute: ServiceFn<
	[{ id: number; jobId: string; revision: number; userId: number | null }],
	undefined
> = async (context, data) => {
	let failureReleaseDocumentId: number | null = null;
	let failureTarget: string | null = null;

	const executeRes = await (async (): ServiceResponse<undefined> => {
		const Releases = new ReleasesRepository(context.db);
		const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
		const ReleaseEvents = new ReleaseEventsRepository(context.db);

		const claimRes = await acquireReleaseWrites(context, { id: data.id });
		if (claimRes.error) return claimRes;
		await using _claims = claimRes.data.claims;

		const release = claimRes.data.release;
		if (
			release.status !== "open" ||
			release.approved_revision !== release.revision ||
			release.revision !== data.revision ||
			release.execution_job_id !== data.jobId
		) {
			return { error: undefined, data: undefined };
		}

		const userRes =
			data.userId === null
				? { error: undefined, data: null }
				: await loadActiveUser(context, { id: data.userId });
		if (userRes.error) return userRes;

		const user = userRes.data;
		if (!user || !getReleaseAccess(context, { release, user }).release) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.releases.permission"),
					status: 403,
				},
				data: undefined,
			};
		}

		const stateRes = await getReleaseState(context, { release });
		if (stateRes.error) return stateRes;

		if (getBlockers(context, { release, state: stateRes.data }).length > 0) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.releases.blocked"),
					status: 409,
				},
				data: undefined,
			};
		}

		for (const document of release.documents) {
			failureReleaseDocumentId = document.id;
			failureTarget = null;

			const state = stateRes.data.get(document.id);
			if (!state?.collection || document.approved_version_id === null) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.releases.not.approved"),
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

			const order = getAllowedTargets(state.collection, document.source);
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
					releaseId: release.id,
				});
				if (promoteRes.error) return promoteRes;
			}
		}
		failureReleaseDocumentId = null;
		failureTarget = null;

		const now = new Date().toISOString();
		const updateRes = await Releases.updateSingle({
			data: {
				status: "released",
				released_at: now,
				failure: null,
				failure_release_document_id: null,
				failure_target: null,
				updated_at: now,
			},
			where: [{ key: "id", operator: "=", value: release.id }],
		});
		if (updateRes.error) return updateRes;

		const proposals = release.documents.flatMap((document) =>
			document.source === "latest" &&
			document.source_version_id !== null &&
			document.source_version_id !== document.approved_version_id
				? [{ ...document, proposalId: document.source_version_id }]
				: [],
		);
		if (proposals.length > 0) {
			const detachRes = await ReleaseDocuments.updateMultiple({
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

		const eventsRes = await ReleaseEvents.createEvents({
			data: [{ release_id: release.id, user_id: user.id, type: "released" }],
		});
		if (eventsRes.error) return eventsRes;

		return { error: undefined, data: undefined };
	})().catch((error: unknown): Awaited<ServiceResponse<undefined>> => {
		logger.error({
			message: "Release execution failed",
			error,
			scope: constants.logScopes.jobs,
			event: "releases.execute.failed",
			data: {
				releaseId: data.id,
				releaseDocumentId: failureReleaseDocumentId,
				target: failureTarget,
			},
		});
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.failed"),
				status: 500,
			},
			data: undefined,
		};
	});
	if (!executeRes.error) return executeRes;

	return {
		error: {
			...executeRes.error,
			cause: new ReleaseExecutionError(failureReleaseDocumentId, failureTarget),
		},
		data: undefined,
	};
};

export default execute;
