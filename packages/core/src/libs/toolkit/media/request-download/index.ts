import type z from "zod";
import type requestDownload from "../../../../services/media/request-download.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Media item to download. */
export type ToolkitMediaRequestDownloadInput = z.input<typeof inputSchema>;
/** Temporary download URL. */
export type ToolkitMediaRequestDownloadResult = NonNullable<
	Awaited<ReturnType<typeof requestDownload>>["data"]
>;

/** Creates a temporary URL for the active crop or original file. Expiry is set by the storage adapter. */
const requestMediaDownload = (
	context: ServiceContext,
	input: ToolkitMediaRequestDownloadInput,
): ServiceResponse<ToolkitMediaRequestDownloadResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: requestDownload } = await import(
				"../../../../services/media/request-download.js"
			);

			return requestDownload(context, { target: { type: "id", id: data.id } });
		},
		name: {
			key: "core.toolkit.media.request-download.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.request-download.error.message",
			defaultMessage: "Lucid toolkit could not create a media download URL.",
		},
	});

export default requestMediaDownload;
