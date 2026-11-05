import type { InternalDocumentField } from "@types";
import type { PreviewItem } from "@/preview/protocol";

/** A repeater's item by its ref, with its position in the builder's list. Null once it's gone. */
export const findPreviewGroup = (
	fields: InternalDocumentField[],
	key: string,
	item: PreviewItem,
) => {
	const groups = fields.find((field) => field.key === key)?.groups ?? [];
	const position = groups.findIndex((group) => group.ref === item.ref);
	const group = groups[position];
	return group ? { group, position } : null;
};

/** Where a repeater item is in its list, searching a brick's fields at any depth, or null once it's gone. */
export const findPreviewItemPosition = (
	fields: InternalDocumentField[],
	item: PreviewItem,
): number | null => {
	for (const field of fields) {
		const groups = field.groups ?? [];
		const position = groups.findIndex((group) => group.ref === item.ref);
		if (position !== -1) return position;
		for (const group of groups) {
			const nested = findPreviewItemPosition(group.fields, item);
			if (nested !== null) return nested;
		}
	}
	return null;
};
