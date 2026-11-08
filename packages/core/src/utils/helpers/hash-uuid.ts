import { createHash } from "node:crypto";

/** Derives a stable version 8 UUID from a value, so retries of the same operation reuse its IDs. */
const hashUuid = (value: string) => {
	const hash = createHash("sha256").update(value).digest("hex");
	const variant = ((Number.parseInt(hash.charAt(16), 16) & 0x3) | 0x8).toString(
		16,
	);

	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

export default hashUuid;
