import crypto from "node:crypto";

/** Quotes an ETag for a response header, keeping a weak `W/` prefix. */
export const formatETag = (etag: string) => {
	const weak = etag.startsWith("W/");
	const normalized = etag.replace(/^W\//, "").replace(/^"+|"+$/g, "");
	return `${weak ? "W/" : ""}"${normalized}"`;
};

export const matchesETag = (header: string | undefined, etag: string) => {
	if (!header) return false;

	const normalizedTarget = formatETag(etag).replace(/^W\//, "");

	return header
		.split(",")
		.map((value) => value.trim())
		.some((value) => {
			if (value === "*") return true;

			return value.replace(/^W\//, "") === normalizedTarget;
		});
};

/** Hashes response bytes to produce a strong ETag. */
export const createBufferETag = (buffer: Uint8Array | Buffer) =>
	crypto.createHash("md5").update(buffer).digest("hex");
