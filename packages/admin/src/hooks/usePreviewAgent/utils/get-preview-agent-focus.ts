import type { AgentDocumentFocus, Collection } from "@types";
import { isPreviewItem, type PreviewTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import { findPreviewBrick } from "@/utils/find-preview-brick";
import { findPreviewConfig } from "@/utils/find-preview-config";
import { findPreviewGroup } from "@/utils/find-preview-group";

/**
 * Resolves preview targets to agent paths: builder brick refs or fixed brick keys, then field keys
 * and repeater item refs. Returns null for removed targets.
 */
export const getPreviewAgentFocus = (props: {
	target: PreviewTarget;
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
		const item = segments[offset + 1];
		if (config.type !== "repeater" || item === undefined) continue;
		if (!isPreviewItem(item)) return null;
		const group = findPreviewGroup(fields, key, item)?.group;
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
