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

/**
 * Formats the canonical storage key into the browser-facing path shape that
 * includes a readable filename segment without changing the stored key itself.
 */
const formatMediaBrowserKey = (props: {
	key: string;
	fileName?: string | null;
}) => {
	const slugifiedFileName = getSlugifiedFileName(props.fileName);
	if (!slugifiedFileName) return props.key;

	const parts = props.key.split("/").filter(Boolean);
	if (parts.length === 0) return props.key;

	return [...parts, slugifiedFileName].join("/");
};

export default formatMediaBrowserKey;
