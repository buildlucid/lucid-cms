import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateHTML } from "@lucidcms/rich-text/browser";
import classnames from "classnames";
import DOMPurify from "dompurify";
import { type Component, createMemo } from "solid-js";

const RichTextContent: Component<{
	value: RichTextJSON;
	class?: string;
}> = (props) => {
	const html = createMemo(() => {
		try {
			return DOMPurify.sanitize(generateHTML(props.value));
		} catch {
			return "";
		}
	});

	return (
		<div
			class={classnames("rich-text-content", props.class)}
			innerHTML={html()}
		/>
	);
};

export default RichTextContent;
