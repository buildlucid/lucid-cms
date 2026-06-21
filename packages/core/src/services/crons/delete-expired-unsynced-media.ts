import { addMilliseconds } from "date-fns";
import constants from "../../constants/constants.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import { getMediaKeyTenantKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import groupQueuePayloadsByTenant from "./helpers/group-queue-payloads-by-tenant.js";

/**
 * Finds all expired media keys that are still awaiting sync and queues them for deletion
 */
const deleteExpiredUnsyncedMedia: ServiceFn<[], undefined> = async (
	context,
) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db.client,
		context.config.db,
	);
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);

	const [allExpiredMediaRes, allExpiredSessionsRes] = await Promise.all([
		MediaAwaitingSync.selectMultiple({
			select: ["key"],
			where: [
				{
					key: "timestamp",
					operator: "<",
					value: addMilliseconds(
						new Date(),
						constants.mediaAwaitingSyncInterval * -1,
					).toISOString(),
				},
			],
			validation: {
				enabled: true,
			},
		}),
		MediaUploadSessions.selectMultiple({
			select: ["session_id", "key"],
			where: [
				{
					key: "expires_at",
					operator: "<",
					value: new Date().toISOString(),
				},
				{
					key: "status",
					operator: "=",
					value: "active",
				},
			],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (allExpiredMediaRes.error) return allExpiredMediaRes;
	if (allExpiredSessionsRes.error) return allExpiredSessionsRes;

	if (
		allExpiredMediaRes.data.length === 0 &&
		allExpiredSessionsRes.data.length === 0
	) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const expiredMediaGroups = groupQueuePayloadsByTenant(
		allExpiredMediaRes.data.map((media) => ({
			payload: {
				key: media.key,
			},
			tenantKeys: [getMediaKeyTenantKey(media.key)],
		})),
	);
	const expiredSessionGroups = groupQueuePayloadsByTenant(
		allExpiredSessionsRes.data.map((session) => ({
			payload: {
				sessionId: session.session_id,
			},
			tenantKeys: [getMediaKeyTenantKey(session.key)],
		})),
	);

	for (const group of expiredMediaGroups) {
		const queueRes = await context.queue.addBatch(context, {
			event: "media:delete-unsynced",
			payloads: group.payloads,
			options:
				group.tenantKeys.length > 0
					? { tenantKeys: group.tenantKeys }
					: undefined,
		});
		if (queueRes.error) return queueRes;
	}

	for (const group of expiredSessionGroups) {
		const queueRes = await context.queue.addBatch(context, {
			event: "media:abort-upload-session",
			payloads: group.payloads,
			options:
				group.tenantKeys.length > 0
					? { tenantKeys: group.tenantKeys }
					: undefined,
		});
		if (queueRes.error) return queueRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredUnsyncedMedia;
