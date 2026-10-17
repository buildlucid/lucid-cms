const sha256 = async (input: string | Uint8Array<ArrayBuffer>) => {
	const bytes =
		typeof input === "string" ? new TextEncoder().encode(input) : input;
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
};

export default sha256;
