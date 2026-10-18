import { contentTypes, HTML_CONTENT_TYPE } from "../constants.js";

const getContentType = (routePath: string): string => {
	const extension = /\.([a-z0-9]+)$/i.exec(routePath)?.[1]?.toLowerCase();
	return (extension && contentTypes[extension]) || HTML_CONTENT_TYPE;
};

export default getContentType;
