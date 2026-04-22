import getDownloadFileName from "./get-download-file-name.js";

/**
 * Builds a safe download disposition header value from persisted media
 * metadata so controllers and adapters all serialize filenames the same way.
 */
const buildDownloadContentDisposition = (props: {
	key: string;
	fileName?: string | null;
	extension?: string | null;
}) => {
	const fileName = getDownloadFileName(props);
	return `attachment; filename="${fileName}"`;
};

export default buildDownloadContentDisposition;
