import { addMilliseconds } from "date-fns";
import mime from "mime-types";
import constants from "../../constants/constants.js";
import getMediaAdapter from "../../libs/media/get-adapter.js";
import {
	MediaAwaitingSyncRepository,
	MediaUploadSessionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { generateKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkCanStoreMedia from "./checks/check-can-store-media.js";

export type UploadSessionResponse =
	| {
			mode: "single";
			key: string;
			url: string;
			headers?: Record<string, string>;
	  }
	| {
			mode: "resumable";
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: Array<{
				partNumber: number;
				etag: string;
				size?: number;
			}>;
	  };

const createSessionId = () => {
	return globalThis.crypto.randomUUID();
};

const createUploadSession: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
			size: number;
			public: boolean;
			temporary?: boolean;
			userId: number;
		},
	],
	UploadSessionResponse
> = async (context, data) => {
	const mediaAdapter = await getMediaAdapter(context.config);
	if (!mediaAdapter.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("media_adapter_not_enabled"),
			},
			data: undefined,
		};
	}

	const sizeRes = await checkCanStoreMedia(context, {
		size: data.size,
	});
	if (sizeRes.error) return sizeRes;

	const extension = mime.extension(data.mimeType);
	const keyRes = generateKey({
		name: data.fileName,
		public: data.public,
		temporary: data.temporary,
	});
	if (keyRes.error) return keyRes;

	const sessionRes = await mediaAdapter.adapter.createUploadSession(
		keyRes.data,
		{
			host: getBaseUrl(context),
			secretKey: context.config.secrets.cookie,
			mimeType: data.mimeType,
			extension: extension || undefined,
			size: data.size,
		},
	);
	if (sessionRes.error) {
		return {
			error: {
				type: "basic",
				message: sessionRes.error.message,
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: sessionRes.error.message,
					},
				},
			},
			data: undefined,
		};
	}
	const uploadKey = sessionRes.data.key;

	if (sessionRes.data.mode === "single") {
		const MediaAwaitingSync = new MediaAwaitingSyncRepository(
			context.db.client,
			context.config.db,
		);
		const awaitingSyncRes = await MediaAwaitingSync.createSingle({
			data: {
				key: uploadKey,
				timestamp: new Date().toISOString(),
			},
			returning: ["key"],
			validation: {
				enabled: true,
			},
		});
		if (awaitingSyncRes.error) return awaitingSyncRes;

		return {
			error: undefined,
			data: {
				mode: "single",
				key: uploadKey,
				url: sessionRes.data.url,
				headers: sessionRes.data.headers,
			},
		};
	}

	const MediaUploadSessions = new MediaUploadSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const sessionId = createSessionId();
	const now = new Date().toISOString();
	const expiresAt =
		sessionRes.data.expiresAt ??
		addMilliseconds(
			new Date(),
			constants.uploadSessionExpiration,
		).toISOString();

	const createRes = await MediaUploadSessions.createSingle({
		data: {
			session_id: sessionId,
			key: uploadKey,
			adapter_key: mediaAdapter.adapter.key,
			adapter_upload_id: sessionRes.data.uploadId,
			mode: "resumable",
			status: "active",
			file_name: data.fileName,
			mime_type: data.mimeType,
			file_extension: extension || null,
			file_size: data.size,
			part_size: sessionRes.data.partSize,
			created_by: data.userId,
			created_at: now,
			updated_at: now,
			expires_at: expiresAt,
		},
		returning: ["session_id"],
		validation: {
			enabled: true,
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: {
			mode: "resumable",
			key: uploadKey,
			sessionId,
			partSize: sessionRes.data.partSize,
			expiresAt,
			uploadedParts: sessionRes.data.uploadedParts,
		},
	};
};

export default createUploadSession;
