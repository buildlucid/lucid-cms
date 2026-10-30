import { isDeepStrictEqual } from "node:util";
import getEmbeddedBrickAccess from "../../../libs/collection/field-access/get-embedded-brick-access.js";
import type { ContentAccess } from "../../../libs/collection/field-access/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentEditableData } from "../../../libs/toolkit/documents/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

type DocumentInput = {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
};

/**
 * Rejects agent and builder changes or removals of restricted embedded bricks before saves restore them, leaving exposure checks to `checkHiddenEmbeddedBricks`.
 * - Bricks a hidden field holds read as missing.
 * - Locked bricks can't change, and can't be removed while rich text still references them.
 */
const checkEmbeddedBrickChanges = (props: {
	access: ContentAccess;
	/** The stored content the write replaces. */
	stored: DocumentInput | undefined;
	/** The authoring values the writer read. */
	before: DocumentEditableData | undefined;
	after: DocumentEditableData;
	/** The full payload the write saves, which leaves out hidden content. */
	payload: DocumentInput;
}): Awaited<ServiceResponse<undefined>> => {
	if (!props.access.restricted || !props.stored) {
		return { error: undefined, data: undefined };
	}

	const notFound = (ref: string) => ({
		error: {
			status: 400,
			message: copy("server:core.documents.authoring.item.not.found", {
				data: { ref },
			}),
		},
		data: undefined,
	});

	const storedAccess = getEmbeddedBrickAccess(props.access, props.stored);
	const referenced = getEmbeddedBrickAccess(props.access, props.payload);

	for (const brick of props.after.bricks.embedded) {
		const level = storedAccess.get(brick.ref) ?? "editable";
		if (level === "editable") continue;
		if (level === "hidden") return notFound(brick.ref);

		const previous = props.before?.bricks.embedded.find(
			(item) => item.ref === brick.ref,
		);
		if (previous && isDeepStrictEqual(previous.fields, brick.fields)) continue;

		return {
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.field.locked", {
					data: { path: `document.bricks.embedded.${brick.ref}` },
				}),
			},
			data: undefined,
		};
	}

	const removed = props.before?.bricks.embedded.find(
		(brick) =>
			storedAccess.get(brick.ref) === "locked" &&
			referenced.has(brick.ref) &&
			!props.after.bricks.embedded.some((item) => item.ref === brick.ref),
	);
	if (removed) {
		return {
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.brick.locked", {
					data: { key: removed.key, path: "document.bricks.embedded" },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkEmbeddedBrickChanges;
