import type { AgentDocumentFocus, Collection } from "@types";
import type { PreviewFieldTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import { findPreviewBrick } from "@/utils/find-preview-brick";
import { findPreviewConfig } from "@/utils/find-preview-config";

/**
 * Resolves preview targets to agent paths: builder brick refs or fixed brick keys, then field keys
 * and repeater item refs. Returns null for removed targets.
 */
export const getPreviewAgentFocus = (props: {
	target: PreviewFieldTarget;
	collection: Collection;
	bricks: BrickData[];
	label: string;
}): AgentDocumentFocus | null => {
	const found = findPreviewBrick(props);
	if (!found) return null;
	const { brick, access } = found;
	let { configs } = found;
	let fields = brick.fields;
	const path: string[] = [];
	const segments = props.target.path;
	for (let offset = 0; offset < segments.length; offset += 1) {
		const key = segments[offset];
		if (typeof key !== "string") return null;
		const match = findPreviewConfig(configs, key, access);
		if (!match) return null;
		//* nested sections and collapsibles shape content but aren't stored
		if (match.kind === "container") {
			configs = match.fields;
			continue;
		}
		path.push(key);
		const { config } = match;
		const index = segments[offset + 1];
		if (config.type !== "repeater" || index === undefined) continue;
		if (typeof index !== "number") return null;
		const group = [...(fields.find((field) => field.key === key)?.groups ?? [])]
			.sort((a, b) => a.order - b.order)
			.at(index);
		if (!group) return null;
		path.push(group.ref);
		configs = config.fields;
		fields = group.fields;
		offset += 1;
	}

	return {
		...(brick.type === "builder"
			? { brick: brick.ref }
			: brick.type === "fixed"
				? { brick: brick.key }
				: {}),
		path,
		label: props.label,
	};
};
