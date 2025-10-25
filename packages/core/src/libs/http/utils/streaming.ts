import type { LucidHonoContext } from "../../../types/hono.js";

export const applyStreamingHeaders = (
	c: LucidHonoContext,
	opts: {
		contentLength?: number;
		contentType?: string;
		key?: string;
	},
) => {
	c.header("Accept-Ranges", "bytes");
	if (opts.key)
		c.header("Content-Disposition", `inline; filename="${opts.key}"`);
	if (opts.contentLength !== undefined)
		c.header("Content-Length", String(opts.contentLength));
	if (opts.contentType) c.header("Content-Type", opts.contentType);
};

export const applyRangeHeaders = (
	c: LucidHonoContext,
	info: {
		isPartial?: boolean;
		range?: { start: number; end: number };
		totalSize?: number;
	},
) => {
	if (info.isPartial && info.range && info.totalSize !== undefined) {
		c.status(206);
		c.header(
			"Content-Range",
			`bytes ${info.range.start}-${info.range.end}/${info.totalSize}`,
		);
	} else {
		c.header("Cache-Control", "public, max-age=31536000, immutable");
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
