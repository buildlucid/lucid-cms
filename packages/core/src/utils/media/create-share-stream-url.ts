import constants from "../../constants/constants.js";

/**
 * Builds the full URL for streaming shared media (image/video/audio preview).
 */
const createShareStreamUrl = (props: { token: string; host: string }) => {
	return `${props.host}/${constants.directories.base}/api/v1/share/${props.token}/stream`;
};

export default createShareStreamUrl;
