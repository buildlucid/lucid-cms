import slug from "slug";

const getFileNameWithoutExtension = (value: string) => {
	const lastDotIndex = value.lastIndexOf(".");
	if (lastDotIndex <= 0) return value;

	return value.slice(0, lastDotIndex);
};

const getSlugifiedFileName = (fileName: string | null | undefined) => {
	if (!fileName) return null;

	const trimmed = fileName.trim();
	if (!trimmed) return null;

	const basename = trimmed.split("/").pop()?.split("\\").pop() ?? trimmed;
	const slugified = slug(getFileNameWithoutExtension(basename), {
		lower: true,
	});

	return slugified || null;
};

const getSlugifiedExtension = (extension: string | null | undefined) => {
	if (!extension) return null;

	const normalized = extension.trim().replace(/^\.+/, "");
	if (!normalized) return null;

	return (
		slug(normalized, {
			lower: true,
		}) || null
	);
};

/**
 * Formats the path a media item is served at under `/cdn`: its uid, then a readable file name. The
 * uid outlasts the file, so replacing it never changes the URL.
 */
const formatMediaPath = (props: {
	uid: string;
	fileName?: string | null;
	extension?: string | null;
}) => {
	const slugifiedFileName = getSlugifiedFileName(props.fileName);
	if (!slugifiedFileName) return props.uid;
	const slugifiedExtension = getSlugifiedExtension(props.extension);
	const displayFileName = slugifiedExtension
		? `${slugifiedFileName}.${slugifiedExtension}`
		: slugifiedFileName;

	return `${props.uid}/${displayFileName}`;
};

export default formatMediaPath;
