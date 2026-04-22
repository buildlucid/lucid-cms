import constants from "../../constants/constants.js";
import formatMediaBrowserKey from "./format-media-browser-key.js";

/**
 * Used to create the url for the media.
 */
const createMediaUrl = (props: {
	key: string;
	host: string;
	fileName?: string | null;
	query?: Record<string, string | undefined>;
}) => {
	const url = new URL(
		`${props.host}/${constants.directories.base}/cdn/${formatMediaBrowserKey({
			key: props.key,
			fileName: props.fileName,
		})}`,
	);

	for (const [key, value] of Object.entries(props.query ?? {})) {
		if (!value) continue;
		url.searchParams.set(key, value);
	}

	return url.toString();
};

export default createMediaUrl;
