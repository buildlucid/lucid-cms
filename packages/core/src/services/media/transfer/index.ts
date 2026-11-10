import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import { LucidError } from "../../../utils/errors/index.js";
import exportMedia from "./export.js";
import identifyMedia from "./identify.js";
import importMedia from "./import.js";
import matchMedia from "./match.js";
import { mediaEntrySchema, mediaSelectionSchema } from "./schema.js";

/** Exports library media details with their file URLs, and imports them by reusing matching files or uploading new ones. */
const mediaTransfer = defineTransfer({
	key: "media",
	label: {
		singular: copy("server:core.transfer.media.singular"),
		plural: copy("server:core.transfer.media.plural"),
	},
	entry: mediaEntrySchema,
	selection: mediaSelectionSchema,
	include: "always",
	reuse: true,
	identify: async ({ context, ...props }) => {
		const result = await identifyMedia(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	match: async ({ context, ...props }) => {
		const result = await matchMedia(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	export: async ({ context, ...props }) => {
		const result = await exportMedia(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	import: async ({ context, ...props }) => {
		const result = await importMedia(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	describe: (entry) => entry.fileName,
});

export default mediaTransfer;
