import constants from "../../constants/constants.js";

/**
 * Used to create the url for the media.
 */
const createMediaUrl = (props: { key: string; host: string }) => {
	return `${props.host}/${constants.directories.base}/cdn/${props.key}`;
};

export default createMediaUrl;
