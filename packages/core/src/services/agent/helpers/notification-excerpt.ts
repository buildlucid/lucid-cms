/** Collapses text to one line of up to 160 characters for a notification. */
const notificationExcerpt = (text: string) => {
	const line = text.replace(/\s+/g, " ").trim();
	return line.length > 160 ? `${line.slice(0, 157)}...` : line;
};

export default notificationExcerpt;
