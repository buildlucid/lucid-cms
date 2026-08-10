import type {
	RichTextEmbeddedBrick,
	RichTextJSON,
	RichTextRenderers,
} from "../../types.js";

/** Renders an embedded brick when the consumer supplies its markup. */
export const renderEmbeddedBrickNode = (props: {
	node: RichTextJSON;
	brick: RichTextEmbeddedBrick | undefined;
	renderer: RichTextRenderers["bricks"];
}) => {
	if (!props.brick || !props.renderer) return "";
	return props.renderer({ node: props.node, brick: props.brick });
};
