import constants from "../../constants/constants.js";

/**
 * Builds the full URL for streaming shared media (image/video/audio preview).
 */
const createShareStreamUrl = (props: {
	token: string;
	host: string;
	poster?: boolean;
}) => {
	const url = `${props.host}/${constants.directories.base}/api/v1/share/${props.token}/stream`;
	return props.poster ? `${url}?poster=true` : url;
};

export default createShareStreamUrl;
