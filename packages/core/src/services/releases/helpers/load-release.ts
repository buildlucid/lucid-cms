import { copy } from "../../../libs/i18n/index.js";
import {
	ReleaseDocumentsRepository,
	ReleaseEventsRepository,
	ReleaseReviewersRepository,
	ReleasesRepository,
	ReleaseTargetsRepository,
} from "../../../libs/repositories/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseRecord } from "../types.js";
import getReleaseAccess from "./get-release-access.js";

/**
 * Loads a release with its document, targets, reviewers and activity. When a
 * user is given, releases they cannot read are reported as not found.
 */
const loadRelease: ServiceFn<
	[{ id: number; user?: LucidUser }],
	ReleaseRecord
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);
	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
	const ReleaseTargets = new ReleaseTargetsRepository(context.db);
	const ReleaseReviewers = new ReleaseReviewersRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const [releaseRes, documentsRes, targetsRes, reviewersRes, eventsRes] =
		await Promise.all([
			Releases.selectSingle({
				select: [
					"id",
					"type",
					"title",
					"description",
					"status",
					"revision",
					"approved_revision",
					"approved_by",
					"approved_at",
					"scheduled_at",
					"scheduled_timezone",
					"scheduled_by",
					"execution_job_id",
					"failure",
					"failure_release_document_id",
					"failure_target",
					"released_at",
					"lock_token",
					"created_by",
					"created_at",
					"updated_at",
				],
				where: [{ key: "id", operator: "=", value: data.id }],
			}),
			ReleaseDocuments.selectMultiple({
				select: [
					"id",
					"release_id",
					"collection_key",
					"document_id",
					"source",
					"source_version_id",
					"approved_version_id",
					"approved_workflow_stage",
				],
				where: [{ key: "release_id", operator: "=", value: data.id }],
				orderBy: [{ column: "id", direction: "asc" }],
			}),
			ReleaseTargets.selectForRelease({ id: data.id }),
			ReleaseReviewers.selectMultiple({
				select: ["id", "release_id", "user_id", "assigned_by", "assigned_at"],
				where: [{ key: "release_id", operator: "=", value: data.id }],
				orderBy: [{ column: "assigned_at", direction: "asc" }],
			}),
			ReleaseEvents.selectMultiple({
				select: [
					"id",
					"release_id",
					"user_id",
					"parent_id",
					"type",
					"body",
					"metadata",
					"resolution",
					"resolved_by",
					"resolved_at",
					"created_at",
					"updated_at",
				],
				where: [{ key: "release_id", operator: "=", value: data.id }],
				orderBy: [
					{ column: "created_at", direction: "asc" },
					{ column: "id", direction: "asc" },
				],
			}),
		]);
	if (releaseRes.error) return releaseRes;
	if (documentsRes.error) return documentsRes;
	if (targetsRes.error) return targetsRes;
	if (reviewersRes.error) return reviewersRes;
	if (eventsRes.error) return eventsRes;

	if (!releaseRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const targetsByDocument = Map.groupBy(
		targetsRes.data ?? [],
		(target) => target.release_document_id,
	);
	const release: ReleaseRecord = {
		...releaseRes.data,
		documents: (documentsRes.data ?? []).map((document) => ({
			...document,
			targets: targetsByDocument.get(document.id) ?? [],
		})),
		reviewers: reviewersRes.data ?? [],
		events: eventsRes.data ?? [],
	};

	if (
		data.user &&
		!getReleaseAccess(context, { release, user: data.user }).read
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

	return { error: undefined, data: release };
};

export default loadRelease;
