/**
 * Converts reply markdown to one plain-text notification line of up to 160 characters.
 * @remarks Handles common inline syntax rather than full markdown.
 */
const notificationExcerpt = (text: string) => {
	const line = text
		.replace(/```[^\n]*\n?/g, "")
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^[ \t]{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])[ \t]+/gm, "")
		.replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
		.replace(/\*(\S(?:.*?\S)?)\*/g, "$1")
		.replace(/(?<!\w)_(\S(?:.*?\S)?)_(?!\w)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
	return line.length > 160 ? `${line.slice(0, 157)}...` : line;
};

export default notificationExcerpt;
