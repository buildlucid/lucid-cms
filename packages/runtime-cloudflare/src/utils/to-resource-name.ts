/** Normalizes a name into the lowercase, hyphenated form Cloudflare resource names accept. */
const toResourceName = (value: string) => {
	const normalized = value
		.toLowerCase()
		.replace(/^@/, "")
		.replace(/[^\da-z]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "lucid-cms";
};

export default toResourceName;
