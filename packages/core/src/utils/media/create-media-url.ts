import constants from "../../constants/constants.js";
import formatMediaPath from "./format-media-path.js";

/**
 * Creates the URL a media item is served at, which stays the same when its file is replaced.
 */
const createMediaUrl = (props: {
	uid: string;
	host: string;
	fileName?: string | null;
	extension?: string | null;
	query?: Record<string, string | undefined>;
}) => {
	const url = new URL(
		`${props.host}${constants.paths.cdn}/${formatMediaPath({
			uid: props.uid,
			fileName: props.fileName,
			extension: props.extension,
		})}`,
	);

	for (const [key, value] of Object.entries(props.query ?? {})) {
		if (!value) continue;
		url.searchParams.set(key, value);
	}

	return url.toString();
};

export default createMediaUrl;
