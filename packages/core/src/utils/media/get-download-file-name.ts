import normalizeMediaKey from "./normalize-media-key.js";

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

/**
 * Prefers the stored original file name for downloads and falls back to the
 * canonical key basename when no display name is available.
 */
const getDownloadFileName = (props: {
	key: string;
	fileName?: string | null;
	extension?: string | null;
}) => {
	const persistedFileName = props.fileName?.trim();
	if (persistedFileName) return sanitizeDownloadFileName(persistedFileName);

	const normalizedKey = normalizeMediaKey(props.key);
	const basename =
		normalizedKey.split("/").filter(Boolean).at(-1) ?? normalizedKey;

	if (!props.extension || basename.endsWith(`.${props.extension}`)) {
		return sanitizeDownloadFileName(basename);
	}

	return sanitizeDownloadFileName(`${basename}.${props.extension}`);
};

export default getDownloadFileName;
