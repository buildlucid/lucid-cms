import {
	escapeHTML,
	escapeHTMLAttribute,
} from "@tiptap/static-renderer/json/html-string";

export const renderMentionNode = (props: {
	userId: unknown;
	label: unknown;
}): string => {
	if (typeof props.label !== "string" || !props.label) return "";
	const userId =
		typeof props.userId === "number"
			? ` data-lucid-user-id="${escapeHTMLAttribute(String(props.userId))}"`
			: "";

	return `<span data-lucid-mention=""${userId}>@${escapeHTML(props.label)}</span>`;
};
