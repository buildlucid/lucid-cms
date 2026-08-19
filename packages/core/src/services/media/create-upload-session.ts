import type { UploadSessionResponse } from "@lucidcms/types";
import { addMilliseconds } from "date-fns";
import mime from "mime-types";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaUploadSessionsRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { generateKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkCanStoreMedia from "./checks/check-can-store-media.js";

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
	if (!context.mediaStorage) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.storage.adapter.not.enabled"),
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

	const sessionRes = await context.mediaStorage.createUploadSession(context, {
		key: keyRes.data,
		host: getBaseUrl(context),
		secretKey: context.config.secrets.cookie,
		fileName: data.fileName,
		mimeType: data.mimeType,
		extension: extension || undefined,
		size: data.size,
	});
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

	const MediaUploadSessions = new MediaUploadSessionsRepository(context.db);
	const sessionId = createSessionId();
	const now = new Date().toISOString();
	const expiresAt =
		("expiresAt" in sessionRes.data ? sessionRes.data.expiresAt : undefined) ??
		addMilliseconds(
			new Date(),
			constants.uploadSessionExpiration,
		).toISOString();

	const adapterUploadId =
		sessionRes.data.protocol === "multipart-parts"
			? sessionRes.data.uploadId
			: sessionRes.data.protocol === "tus"
				? (sessionRes.data.uploadId ?? null)
				: null;
	const clientData =
		sessionRes.data.protocol === "http"
			? { request: sessionRes.data.request }
			: sessionRes.data.protocol === "tus"
				? {
						endpoint: sessionRes.data.endpoint,
						headers: sessionRes.data.headers ?? {},
						metadata: sessionRes.data.metadata,
					}
				: null;

	const createRes = await MediaUploadSessions.createSingle({
		data: {
			session_id: sessionId,
			key: uploadKey,
			adapter_key: context.mediaStorage.key,
			adapter_upload_id: adapterUploadId,
			protocol: sessionRes.data.protocol,
			client_data: clientData,
			status: "active",
			file_name: data.fileName,
			mime_type: data.mimeType,
			file_extension: extension || null,
			file_size: data.size,
			part_size:
				sessionRes.data.protocol === "multipart-parts"
					? sessionRes.data.partSize
					: null,
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

	if (sessionRes.data.protocol === "http") {
		return {
			error: undefined,
			data: {
				protocol: "http",
				key: uploadKey,
				sessionId,
				expiresAt,
				request: sessionRes.data.request,
			},
		};
	}

	if (sessionRes.data.protocol === "tus") {
		return {
			error: undefined,
			data: {
				protocol: "tus",
				key: uploadKey,
				sessionId,
				expiresAt,
				endpoint: sessionRes.data.endpoint,
				headers: sessionRes.data.headers ?? {},
				metadata: sessionRes.data.metadata,
			},
		};
	}

	return {
		error: undefined,
		data: {
			protocol: "multipart-parts",
			key: uploadKey,
			sessionId,
			partSize: sessionRes.data.partSize,
			expiresAt,
			uploadedParts: sessionRes.data.uploadedParts,
		},
	};
};

export default createUploadSession;
