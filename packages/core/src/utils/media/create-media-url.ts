/**
 * Used to create the url for the media.
 */
const createMediaUrl = (props: { key: string; host: string }) => {
	return `${props.host}/cdn/${props.key}`;
};

export default createMediaUrl;
