import type { ErrorResponse } from "@types";
import { mediaSaveReq } from "@/services/api/ai/useMediaSave";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";

/** Copies generated media into server storage, returning its key or null after reporting errors to `onError`. */
export const saveGeneratedMedia = async (
	props: Parameters<typeof mediaSaveReq>[0] & {
		onError: (_error: ErrorResponse) => void;
	},
) => {
	try {
		const saved = await mediaSaveReq(props);
		return saved.data.key;
	} catch (error) {
		props.onError(
			error instanceof LucidError
				? error.errorRes
				: {
						status: 500,
						name: T()("media.upload.error.title"),
						message: T()("media.upload.error.description"),
					},
		);
		return null;
	}
};
