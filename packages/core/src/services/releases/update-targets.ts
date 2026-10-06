import collections from "../../libs/collection/collections.js";
import { copy } from "../../libs/i18n/index.js";
import {
	ReleaseEventsRepository,
	ReleaseTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireReleaseWrites from "./helpers/acquire-release-writes.js";
import createTargets from "./helpers/create-targets.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import resolveTargets from "./helpers/resolve-targets.js";

/** Changes where a release document is published to, recording each change in the activity. */
const updateTargets: ServiceFn<
	[
		{
			id: number;
			releaseDocumentId: number;
			user: LucidUser;
			targets: string[];
		},
	],
	undefined
> = async (context, data) => {
	const ReleaseTargets = new ReleaseTargetsRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const claimRes = await acquireReleaseWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const release = claimRes.data.release;
	if (!getReleaseAccess(context, { release, user: data.user }).edit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (release.type === "create") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.create.fixed"),
				status: 400,
			},
			data: undefined,
		};
	}

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

	const collectionRes = await collections.getSingle(context, {
		key: document.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const targetsRes = resolveTargets({
		collection: collectionRes.data,
		source: document.source,
		targets: data.targets,
	});
	if (targetsRes.error) return targetsRes;

	const targets = targetsRes.data;
	const removed = document.targets.filter(
		(target) => !targets.includes(target.target),
	);
	const added = targets.filter(
		(target) => !document.targets.some((other) => other.target === target),
	);
	if (removed.length === 0 && added.length === 0) {
		return { error: undefined, data: undefined };
	}

	if (removed.length > 0) {
		const deleteRes = await ReleaseTargets.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "in",
					value: removed.map((target) => target.id),
				},
			],
		});
		if (deleteRes.error) return deleteRes;
	}

	const addedRes = await createTargets(context, {
		releaseDocumentId: document.id,
		targets: added,
	});
	if (addedRes.error) return addedRes;

	const eventsRes = await ReleaseEvents.createEvents({
		data: [
			...added.map((target) => ({
				release_id: release.id,
				user_id: data.user.id,
				type: "target_added" as const,
				metadata: { releaseDocumentId: document.id, target },
			})),
			...removed.map((target) => ({
				release_id: release.id,
				user_id: data.user.id,
				type: "target_removed" as const,
				metadata: { releaseDocumentId: document.id, target: target.target },
			})),
		],
	});
	if (eventsRes.error) return eventsRes;

	const dismissRes = await dismissApproval(context, {
		ids: [release.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	return { error: undefined, data: undefined };
};

export default updateTargets;
