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
			select: ["session_id"],
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

	const queueRes = await Promise.all([
		allExpiredMediaRes.data.length > 0
			? context.queue.addBatch("media:delete-unsynced", {
					payloads: allExpiredMediaRes.data.map((media) => ({
						key: media.key,
					})),
					context: context,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
		allExpiredSessionsRes.data.length > 0
			? context.queue.addBatch("media:abort-upload-session", {
					payloads: allExpiredSessionsRes.data.map((session) => ({
						sessionId: session.session_id,
					})),
					context: context,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
	]);
	const queueError = queueRes.find((res) => res.error);
	if (queueError?.error) return queueError;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredUnsyncedMedia;
