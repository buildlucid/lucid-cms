import { mediaTable } from "../../../../db/tables/index.js";
import type { CanLinkTarget } from "../../types.js";
import type { MediaValidationData } from "./types.js";

/** Leaves out the media `canLink` refuses, passing the uploader so they can link their own files. */
const restrictMediaValidationData = (
	media: MediaValidationData[],
	canLink: CanLinkTarget,
) =>
	media.filter((item) =>
		canLink({
			resource: "media",
			table: mediaTable.name,
			value: item.id,
			createdBy: item.created_by,
		}),
	);

export default restrictMediaValidationData;
