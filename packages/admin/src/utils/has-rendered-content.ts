/** Whether resolved children show anything. Solid renders nothing for null, undefined, booleans and empty strings. */
const hasRenderedContent = (nodes: readonly unknown[]) =>
	nodes.some(
		(node) =>
			node !== null &&
			node !== undefined &&
			node !== "" &&
			typeof node !== "boolean",
	);

export default hasRenderedContent;
