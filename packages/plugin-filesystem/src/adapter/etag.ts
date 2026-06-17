import crypto from "node:crypto";

export const createBufferETag = (buffer: Uint8Array | Buffer) =>
	crypto.createHash("md5").update(buffer).digest("hex");

export const formatETag = (etag: string) => {
	const normalized = etag.replace(/^W\//, "").replace(/^"+|"+$/g, "");
	return `"${normalized}"`;
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
