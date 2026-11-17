/** An origin no website has, to read a path against. */
const PLACEHOLDER = "https://website.invalid";

/** Browsers drop control characters such as tabs from addresses, and read backslashes as slashes. */
const isUnsafeCharacter = (character: string) => {
	const code = character.charCodeAt(0);
	return code < 0x20 || code === 0x7f || character === "\\";
};

/**
 * Allows site-relative paths and absolute HTTP(S) redirects. Rejects other schemes, protocol-
 * relative paths and ambiguous whitespace or backslashes.
 */
const isSafeRedirect = (url: string): boolean => {
	const value = url.trim();
	if ([...value].some(isUnsafeCharacter)) return false;

	try {
		if (value.startsWith("/")) {
			return new URL(value, PLACEHOLDER).origin === PLACEHOLDER;
		}

		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
};

export default isSafeRedirect;
