/**
 * Adds a request's query string to a redirect location, before any fragment so it reaches the
 * destination. A location with its own query string keeps it instead.
 */
const carryQueryString = (location: string, search: string) => {
	const hashIndex = location.indexOf("#");
	const base = hashIndex === -1 ? location : location.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : location.slice(hashIndex);
	if (!search || base.includes("?")) return location;

	return `${base}${search}${hash}`;
};

export default carryQueryString;
