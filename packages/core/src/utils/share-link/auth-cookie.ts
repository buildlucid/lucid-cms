/**
 * Create a cookie name for the share link authentication
 */
const createAuthCookieName = (token: string) => {
	return `lucid-share-auth-${token}`;
};

export default createAuthCookieName;
