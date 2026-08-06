import { addMilliseconds } from "date-fns";
import constants from "../../constants/constants.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all expired media keys that are still awaiting sync and queues them for deletion
 */
const deleteExpiredUnsyncedMedia: ServiceFn<[], undefined> = async (
	context,
) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);
	const MediaUploadSessions = new MediaUploadSessionsRepository(context.db);

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

	if (allExpiredMediaRes.data.length > 0) {
		const queueRes = await context.queue.addBatch(context, {
			event: "media:delete-unsynced",
			payloads: allExpiredMediaRes.data.map((media) => ({
				key: media.key,
			})),
		});
		if (queueRes.error) return queueRes;
	}

	if (allExpiredSessionsRes.data.length > 0) {
		const queueRes = await context.queue.addBatch(context, {
			event: "media:abort-upload-session",
			payloads: allExpiredSessionsRes.data.map((session) => ({
				sessionId: session.session_id,
			})),
		});
		if (queueRes.error) return queueRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredUnsyncedMedia;
