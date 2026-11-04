import type { Collection, InternalDocumentField } from "@types";
import type { PreviewFieldTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import { findPreviewBrick } from "@/utils/find-preview-brick";
import { findPreviewConfig } from "@/utils/find-preview-config";
import type { FieldAccess } from "@/utils/resolve-field-access";

/** A field on the page, with where its value is kept in the builder's store. */
export type PreviewEditableField = {
	brickIndex: number;
	brickRef: string;
	config: CollectionLeafFieldConfig;
	/** The fields its value is kept among: its brick's, or its repeater item's. */
	fields: InternalDocumentField[];
	/** For a field in a repeater item, the item's ref and the repeater's key. */
	groupRef?: string;
	repeaterKey?: string;
	/** What the user can do with it, after its brick, repeaters, tabs and containers. */
	access: FieldAccess;
};

/**
 * Resolves a page target to the field it shows in the builder's store, through nested sections
 * and repeater items. Null for bricks, items, repeaters and anything no longer there.
 */
export const resolvePreviewField = (props: {
	target: PreviewFieldTarget;
	collection: Collection;
	bricks: BrickData[];
}): PreviewEditableField | null => {
	const found = findPreviewBrick(props);
	if (!found) return null;
	const { brick, brickIndex } = found;
	let { configs, access } = found;
	let fields = brick.fields;
	let item: { groupRef: string; repeaterKey: string } | undefined;

	const { path } = props.target;
	for (let offset = 0; offset < path.length;) {
		const key = path[offset];
		if (typeof key !== "string") return null;
		const match = findPreviewConfig(configs, key, access);
		if (!match) return null;
		if (match.kind === "container") {
			configs = match.fields;
			access = match.access;
			offset += 1;
			continue;
		}

		const { config } = match;
		const last = offset === path.length - 1;
		if (config.type !== "repeater") {
			if (!last) return null;
			return {
				brickIndex,
				brickRef: brick.ref,
				config,
				fields,
				...item,
				access: match.access,
			};
		}

		const index = path[offset + 1];
		if (last || typeof index !== "number") return null;
		const group = [...(fields.find((field) => field.key === key)?.groups ?? [])]
			.sort((a, b) => a.order - b.order)
			.at(index);
		if (!group) return null;
		configs = config.fields;
		access = match.access;
		fields = group.fields;
		item = { groupRef: group.ref, repeaterKey: key };
		offset += 2;
	}
	return null;
};
