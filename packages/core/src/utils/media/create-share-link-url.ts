/**
 * Used to create the url for the media share link.
 */
const createShareLinkUrl = (props: { token: string; host: string }) => {
	return `${props.host}/share/${props.token}`;
};

export default createShareLinkUrl;
