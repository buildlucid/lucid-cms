/**
 * Whether a URL's hostname only resolves on this machine, so search engines can't fetch it: the
 * `localhost` names, the 127.0.0.0/8 loopback range, and `::1`, also as an IPv4-mapped address.
 * Takes `URL.hostname`, which writes IPv4-mapped addresses in hex, such as `[::ffff:7f00:1]`.
 */
const isLocalHost = (hostname: string) => {
	const host = hostname.replace(/\.$/, "");
	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		/^127\.\d+\.\d+\.\d+$/.test(host) ||
		host === "[::1]" ||
		/^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/.test(host)
	);
};

export default isLocalHost;
