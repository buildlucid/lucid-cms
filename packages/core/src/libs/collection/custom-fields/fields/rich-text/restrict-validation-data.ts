import { refResourceKeys } from "../../../../refs/constants.js";
import { addRefTarget } from "../../../../refs/targets.js";
import type { RefTargets } from "../../../../refs/types.js";
import type { CanLinkTarget } from "../../types.js";
import restrictMediaValidationData from "../media/restrict-validation-data.js";
import restrictRelationValidationData from "../relation/restrict-validation-data.js";
import type { RichTextValidationData } from "./types.js";

/** Leaves out the documents and media `canLink` refuses, including stored targets that could otherwise stay while missing. */
const restrictRichTextValidationData = (
	data: RichTextValidationData,
	canLink: CanLinkTarget,
): RichTextValidationData => {
	let retainedReferences: RefTargets | undefined;
	if (data.retainedReferences) {
		retainedReferences = {};
		for (const resource of refResourceKeys) {
			for (const [table, values] of data.retainedReferences[resource] ?? []) {
				for (const value of values) {
					if (canLink({ resource, table, value })) {
						addRefTarget(retainedReferences, { resource, table, value });
					}
				}
			}
		}
	}

	return {
		...data,
		documents: restrictRelationValidationData(data.documents, canLink),
		media: restrictMediaValidationData(data.media, canLink),
		retainedReferences,
	};
};

export default restrictRichTextValidationData;
