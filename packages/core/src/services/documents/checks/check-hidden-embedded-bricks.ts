import filterReadableContent from "../../../libs/collection/field-access/filter-readable-content.js";
import getEmbeddedBrickAccess from "../../../libs/collection/field-access/get-embedded-brick-access.js";
import type { ContentAccess } from "../../../libs/collection/field-access/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

type DocumentInput = {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
};

const readableRefs = (access: ContentAccess, content: DocumentInput) => {
	const readable = filterReadableContent(access, content);
	return new Set(
		getEmbeddedBrickAccess(access, {
			fields: readable.fields ?? [],
			bricks: readable.bricks ?? [],
		}).keys(),
	);
};

/** Rejects saves that expose hidden embedded bricks, such as by removing their hidden field, or newly reference them from readable content, reporting them as missing. */
const checkHiddenEmbeddedBricks = (
	access: ContentAccess,
	stored: DocumentInput,
	saved: DocumentInput,
): Awaited<ServiceResponse<undefined>> => {
	const storedAccess = getEmbeddedBrickAccess(access, stored);
	const storedReadable = readableRefs(access, stored);
	const savedReadable = readableRefs(access, saved);
	for (const [ref, level] of getEmbeddedBrickAccess(access, saved)) {
		if (storedAccess.get(ref) !== "hidden") continue;
		if (
			level === "hidden" &&
			(!savedReadable.has(ref) || storedReadable.has(ref))
		) {
			continue;
		}

		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.documents.authoring.item.not.found", {
					data: { ref },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkHiddenEmbeddedBricks;
