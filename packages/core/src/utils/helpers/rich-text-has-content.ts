import { richTextNodeNames } from "@lucidcms/rich-text";
import { getObject } from "./get-typed-value.js";

const contentAtomTypes = new Set<string>([
	"horizontalRule",
	...Object.values(richTextNodeNames),
]);

const richTextHasContent = (node: unknown): boolean => {
	const nodeObject = getObject(node);
	if (!nodeObject) return false;
	if (nodeObject.type === "text") {
		return typeof nodeObject.text === "string" && nodeObject.text.length > 0;
	}
	if (
		typeof nodeObject.type === "string" &&
		contentAtomTypes.has(nodeObject.type)
	) {
		return true;
	}

	return (
		Array.isArray(nodeObject.content) &&
		nodeObject.content.some(richTextHasContent)
	);
};

export default richTextHasContent;
