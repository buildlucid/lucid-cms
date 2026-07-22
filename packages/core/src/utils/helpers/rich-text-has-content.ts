import { getObject } from "./get-typed-value.js";

const richTextHasContent = (node: unknown): boolean => {
	const nodeObject = getObject(node);
	if (!nodeObject) return false;
	if (nodeObject.type === "text") {
		return typeof nodeObject.text === "string" && nodeObject.text.length > 0;
	}
	if (nodeObject.type === "horizontalRule") return true;

	return (
		Array.isArray(nodeObject.content) &&
		nodeObject.content.some(richTextHasContent)
	);
};

export default richTextHasContent;
