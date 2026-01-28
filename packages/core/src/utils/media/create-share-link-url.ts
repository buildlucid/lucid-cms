import constants from "../../constants/constants.js";

/**
 * Used to create the url for the media share link.
 */
const createShareLinkUrl = (props: { token: string; host: string }) => {
	return `${props.host}/${constants.directories.base}/share/${props.token}`;
};

export default createShareLinkUrl;
