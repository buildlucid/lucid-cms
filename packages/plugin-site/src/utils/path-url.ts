/** A path's URL on a site URL's origin, as the SEO plugin builds a page's. */
const pathUrl = (siteUrl: string, path: string) => {
	const url = new URL("/", siteUrl);
	url.pathname = path.trim();
	return url;
};

export default pathUrl;
