import type { SavedGeneratedMedia } from "@lucidcms/types";
import { mediaGenerationOf } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import storePendingUpload from "../../media/helpers/store-pending-upload.js";
import { normalizeUploadFile } from "../../media/helpers/upload-file.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import downloadGeneratedMedia from "../helpers/download-generated-media.js";
import { mediaOutputSchema } from "../helpers/media-output.js";

/** Copies a finished generation into storage for creating or replacing media without a browser upload. */
const mediaSave: ServiceFn<
	[
		{
			requestId: string;
			public: boolean;
			/** Stores the file under a temporary key, for replacing an existing media item's file. */
			temporary?: boolean;
			userId: number;
			signal: AbortSignal;
		},
	],
	SavedGeneratedMedia
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);
	const generationRes = await AiGenerations.selectSingleByRequestId({
		requestId: props.requestId,
		select: ["feature_key", "status", "output", "user_id"],
	});
	if (generationRes.error) return generationRes;

	const generation = generationRes.data;
	const type =
		generation?.status === "success" && generation.user_id === props.userId
			? mediaGenerationOf(generation.feature_key)?.type
			: undefined;
	const media = type
		? mediaOutputSchema.safeParse({ type, output: generation?.output })
		: undefined;
	if (!type || !media?.success) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.generation.request.not.found"),
			},
			data: undefined,
		};
	}

	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: `${type}Generation`,
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const { output } = media.data;
	const bytes = await downloadGeneratedMedia(context, {
		storageKey: output.storageKey,
		signal: props.signal,
	});
	if (bytes.error) return bytes;

	const fileName = `${output.id}.${output.extension}`;
	const stored = await storePendingUpload(context, {
		file: normalizeUploadFile({
			fileName,
			mimeType: output.mimeType,
			body: bytes.data,
		}),
		public: props.public,
		temporary: props.temporary,
	});
	if (stored.error) return stored;

	return {
		error: undefined,
		data: {
			key: stored.data.key,
			fileName,
			mimeType: output.mimeType,
			size: bytes.data.byteLength,
		},
	};
};

export default mediaSave;
