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
 * Formats the canonical storage key into the browser-facing path shape that
 * includes a readable filename segment without changing the stored key itself.
 */
const formatMediaBrowserKey = (props: {
	key: string;
	fileName?: string | null;
	extension?: string | null;
}) => {
	const slugifiedFileName = getSlugifiedFileName(props.fileName);
	if (!slugifiedFileName) return props.key;
	const slugifiedExtension = getSlugifiedExtension(props.extension);
	const displayFileName = slugifiedExtension
		? `${slugifiedFileName}.${slugifiedExtension}`
		: slugifiedFileName;

	const parts = props.key.split("/").filter(Boolean);
	if (parts.length === 0) return props.key;

	return [...parts, displayFileName].join("/");
};

export default formatMediaBrowserKey;
