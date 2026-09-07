import updateSingleMedia from "../../../services/media/update-single.js";
import type { MediaOrigin } from "../../../types/response.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

/** Media details to change. Omitted values are preserved. */
export type ToolkitMediaUpdateSingleInput = {
	id: number;
	fileName?: string;
	folderId?: number | null;
	public?: boolean;
	isHidden?: boolean;
	isDeleted?: boolean;
	origin?: MediaOrigin;
	title?: { localeCode: string | null; value: string | null }[];
	alt?: { localeCode: string | null; value: string | null }[];
	description?: { localeCode: string | null; value: string | null }[];
	summary?: { localeCode: string | null; value: string | null }[];
	width?: number | null;
	height?: number | null;
	duration?: number | null;
	focalPoint?: { x: number; y: number } | null;
	blurHash?: string | null;
	averageColor?: string | null;
	base64?: string | null;
	isDark?: boolean | null;
	isLight?: boolean | null;
	/** CMS user credited with the change. Omit for no user attribution. */
	userId?: number | null;
};

/** ID of the updated media item. */
export type ToolkitMediaUpdateSingleResult = { id: number };

/** Updates media details without uploading a file. */
const updateSingle = (
	context: ServiceContext,
	input: ToolkitMediaUpdateSingleInput,
): ServiceResponse<ToolkitMediaUpdateSingleResult> =>
	runToolkitService({
		handler: async () => {
			const result = await serviceWrapper(updateSingleMedia, {
				transaction: true,
			})(context, { ...input, userId: input.userId ?? null });
			if (result.error) return result;

			return { error: undefined, data: { id: result.data } };
		},
		name: {
			key: "core.toolkit.media.update-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.update-single.error.message",
			defaultMessage: "Lucid toolkit could not update media.",
		},
	});

export default updateSingle;
