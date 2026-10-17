import { contentTypes } from "../constants.js";

const HTML = "text/html; charset=utf-8";

const getContentType = (routePath: string): string => {
	const extension = /\.([a-z0-9]+)$/i.exec(routePath)?.[1]?.toLowerCase();
	return (extension && contentTypes[extension]) || HTML;
};

export default getContentType;
