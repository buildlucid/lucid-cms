import deleteSingleMedia from "../../../services/media/delete-single.js";
import deleteSinglePermanently from "../../../services/media/delete-single-permanently.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

/** Media item to delete. */
export type ToolkitMediaDeleteSingleInput = {
	id: number;
	/** Permanently remove the file and its media record. Defaults to false. */
	hard?: boolean;
};

/** Soft-deletes media by default. Set hard to permanently remove it and its owned files. */
const deleteSingle = (
	context: ServiceContext,
	input: ToolkitMediaDeleteSingleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		handler: () =>
			serviceWrapper(input.hard ? deleteSinglePermanently : deleteSingleMedia, {
				transaction: true,
			})(context, { id: input.id, userId: null }),
		name: {
			key: "core.toolkit.media.delete-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.delete-single.error.message",
			defaultMessage: "Lucid toolkit could not delete single media.",
		},
	});

export default deleteSingle;
