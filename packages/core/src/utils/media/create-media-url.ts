import type { UrlStrategy } from "../../types/config.js";

/**
 * Used to create the url for the media.
 * If a url strategy is provided, it will use that to generate the url.
 * Otherwise, it will use the cdn endpoint.
 */
const createMediaUrl = (props: {
	key: string;
	host: string;
	urlStrategy?: UrlStrategy;
}) => {
	if (props.urlStrategy) {
		return props.urlStrategy({
			key: props.key,
		});
	}
	return `${props.host}/cdn/${props.key}`;
};

export default createMediaUrl;
