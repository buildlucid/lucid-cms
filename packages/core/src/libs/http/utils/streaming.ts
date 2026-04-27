import type { LucidHonoContext } from "../../../types/hono.js";
import { formatETag } from "../../../utils/http/etag.js";

export const applyStreamingHeaders = (
	c: LucidHonoContext,
	opts: {
		contentLength?: number;
		contentType?: string;
		key?: string;
		etag?: string;
	},
) => {
	c.header("Accept-Ranges", "bytes");
	c.header("X-Content-Type-Options", "nosniff");
	if (opts.key)
		c.header("Content-Disposition", `inline; filename="${opts.key}"`);
	if (opts.contentLength !== undefined)
		c.header("Content-Length", String(opts.contentLength));
	if (opts.contentType) c.header("Content-Type", opts.contentType);
	if (opts.etag) c.header("ETag", formatETag(opts.etag));
};

export const applyRangeHeaders = (
	c: LucidHonoContext,
	info: {
		isPartial?: boolean;
		range?: { start: number; end: number };
		totalSize?: number;
		cacheControl?: string;
	},
) => {
	if (info.isPartial && info.range && info.totalSize !== undefined) {
		c.status(206);
		c.header(
			"Content-Range",
			`bytes ${info.range.start}-${info.range.end}/${info.totalSize}`,
		);
	} else {
		c.header(
			"Cache-Control",
			info.cacheControl ?? "public, max-age=31536000, immutable",
		);
	}
};

export const parseRangeHeader = (header: string | undefined) => {
	if (!header) return undefined;
	const match = header.match(/bytes=(\d+)-(\d*)/);
	if (match?.[1]) {
		const start = Number.parseInt(match[1], 10);
		const end = match[2] ? Number.parseInt(match[2], 10) : undefined;
		return { start, end };
	}
	return undefined;
};
