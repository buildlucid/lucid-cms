const DEFAULT_PORTS: Record<string, string> = {
	"http:": "80",
	"https:": "443",
};

/**
 * The `Host` values a request for a URL can arrive with: its host and, when it has no port of its
 * own, its host with its scheme's default port, as a proxy that ends TLS can pass on an `http`
 * request for `example.com:443`. A URL with any other port only answers to that port.
 */
const getUrlHosts = (url: string | URL): string[] => {
	const { host, hostname, port, protocol } = new URL(url);
	const defaultPort = DEFAULT_PORTS[protocol];
	return port === "" && defaultPort !== undefined
		? [host, `${hostname}:${defaultPort}`]
		: [host];
};

export default getUrlHosts;
