import { copy } from "../../libs/i18n/index.js";
import {
	ReleaseEventsRepository,
	ReleasesRepository,
	ReleaseTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireReleaseWrites from "./helpers/acquire-release-writes.js";
import canEditDocument from "./helpers/can-edit-document.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getReleaseState from "./helpers/get-release-state.js";

/**
 * Acknowledges that someone else published to a target, for the exact version
 * shown, or withdraws that acknowledgement. Anyone who can read the release
 * and edit the document can. Both are recorded in the activity.
 */
const reviewTarget: ServiceFn<
	[
		{
			id: number;
			releaseDocumentId: number;
			target: string;
			revision: number;
			targetVersionId: number | null;
			reviewed: boolean;
			user: LucidUser;
		},
	],
	undefined
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);
	const ReleaseTargets = new ReleaseTargetsRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const claimRes = await acquireReleaseWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const release = claimRes.data.release;
	const document = release.documents.find(
		(document) => document.id === data.releaseDocumentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (
		!canEditDocument({
			release,
			collectionKey: document.collection_key,
			user: data.user,
		})
	) {
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

	const target = document.targets.find(
		(target) => target.target === data.target,
	);
	const currentVersionId =
		stateRes.data.get(document.id)?.versions.get(data.target)?.id ?? null;
	if (
		!target ||
		data.revision !== release.revision ||
		data.targetVersionId !== currentVersionId
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const reviewedAt = new Date().toISOString();
	const targetRes = await ReleaseTargets.updateSingle({
		data: {
			reviewed_version_id: data.reviewed ? data.targetVersionId : null,
			reviewed_by: data.reviewed ? data.user.id : null,
			reviewed_at: data.reviewed ? reviewedAt : null,
		},
		where: [{ key: "id", operator: "=", value: target.id }],
	});
	if (targetRes.error) return targetRes;

	const eventsRes = await ReleaseEvents.createEvents({
		data: [
			{
				release_id: release.id,
				user_id: data.user.id,
				type: data.reviewed ? "target_reviewed" : "target_unreviewed",
				metadata: { target: data.target, releaseDocumentId: document.id },
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	if (!data.reviewed && release.approved_revision === release.revision) {
		const dismissRes = await dismissApproval(context, {
			ids: [release.id],
			userId: data.user.id,
		});
		if (dismissRes.error) return dismissRes;
	}

	const releaseRes = await Releases.updateSingle({
		data: { updated_at: reviewedAt },
		where: [{ key: "id", operator: "=", value: release.id }],
	});
	if (releaseRes.error) return releaseRes;

	return { error: undefined, data: undefined };
};

export default reviewTarget;
