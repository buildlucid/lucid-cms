const replaceControlCharacters = (value: string) =>
	Array.from(value, (char) => {
		const code = char.charCodeAt(0);
		return code <= 31 || code === 127 ? " " : char;
	}).join("");

const sanitizeDownloadFileName = (value: string) => {
	const basename =
		value.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? value;

	const normalized = replaceControlCharacters(basename)
		.replace(/"/g, "")
		.replace(/\s+/g, " ")
		.trim();

	return normalized || "download";
};

const buildDownloadContentDisposition = (props: {
	key: string;
	fileName?: string | null;
	extension?: string | null;
}) => {
	const persistedFileName = props.fileName?.trim();
	const normalizedKey =
		props.key.split("/").filter(Boolean).at(-1) ?? props.key;

	const fileName = persistedFileName
		? sanitizeDownloadFileName(persistedFileName)
		: sanitizeDownloadFileName(
				props.extension && !normalizedKey.endsWith(`.${props.extension}`)
					? `${normalizedKey}.${props.extension}`
					: normalizedKey,
			);

	return `attachment; filename="${fileName}"`;
};

export default buildDownloadContentDisposition;
