/**
 * Constructs the callback URL
 */
const buildCallbackRedirectUrl = (host: string, provider: string) => {
	return `${host}/api/v1/auth/providers/${provider}/callback`;
};

export default buildCallbackRedirectUrl;
