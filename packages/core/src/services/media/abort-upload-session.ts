import getMediaAdapter from "../../libs/media/get-adapter.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const abortUploadSession: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	undefined
> = async (context, data) => {
	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db.client,
		context.config.db,
	);

	const sessionRes = await MediaUploadSessions.selectSingle({
		select: ["session_id", "key", "adapter_upload_id", "status"],
		where: [{ key: "session_id", operator: "=", value: data.sessionId }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (sessionRes.error) return sessionRes;

	const mediaAdapter = await getMediaAdapter(context.config);
	if (
		mediaAdapter.enabled &&
		sessionRes.data.adapter_upload_id &&
		mediaAdapter.adapter.abortUploadSession
	) {
		const abortRes = await mediaAdapter.adapter.abortUploadSession({
			key: sessionRes.data.key,
			uploadId: sessionRes.data.adapter_upload_id,
		});
		if (abortRes.error) return abortRes;
	}

	await Promise.all([
		MediaAwaitingSync.deleteSingle({
			where: [{ key: "key", operator: "=", value: sessionRes.data.key }],
		}),
		mediaAdapter.enabled
			? mediaAdapter.adapter.delete(sessionRes.data.key)
			: null,
	]);

	const deleteSessionRes = await MediaUploadSessions.deleteSingle({
		where: [{ key: "session_id", operator: "=", value: data.sessionId }],
		returning: ["session_id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteSessionRes.error) return deleteSessionRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default abortUploadSession;
