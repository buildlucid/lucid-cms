import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
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
	identify: identifyMedia,
	match: matchMedia,
	export: exportMedia,
	import: importMedia,
	describe: (entry) => entry.fileName,
});

export default mediaTransfer;
