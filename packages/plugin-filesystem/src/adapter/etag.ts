import crypto from "node:crypto";

const createBufferETag = (buffer: Uint8Array | Buffer) =>
	crypto.createHash("md5").update(buffer).digest("hex");

/** A stored file's ETag, from when it was last written and its size. Every service reports this one. */
export const createFileETag = (stats: { mtime: Date; size: number }) =>
	createBufferETag(Buffer.from(`${stats.mtime.getTime()}-${stats.size}`));

const formatETag = (etag: string) => {
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
