import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";

/** A robots.txt group, with every value as a list, as the plugin's options parse it. */
export type RobotsGroup = NonNullable<
	Exclude<SeoPluginOptionsInternal["robots"], false>["rules"]
>[number];

/**
 * Writes robots.txt: each group's `User-agent`, `Allow` and `Disallow` lines, a blank line between
 * groups, and the `Sitemap:` line last when there is a sitemap. A group without rules gets
 * `Allow: /`, as crawlers read user agents up to the next rule as one group (RFC 9309), so it would
 * otherwise take the next group's rules.
 */
const buildRobotsText = (props: {
	groups: RobotsGroup[];
	sitemapUrl: string | null;
}) => {
	const blocks = props.groups.map((group) =>
		[
			...group.userAgent.map((agent) => `User-agent: ${agent}`),
			...(group.allow.length === 0 && group.disallow.length === 0
				? ["Allow: /"]
				: group.allow.map((path) => `Allow: ${path}`)),
			...group.disallow.map((path) => `Disallow: ${path}`),
		].join("\n"),
	);
	if (props.sitemapUrl !== null) blocks.push(`Sitemap: ${props.sitemapUrl}`);

	return blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
};

export default buildRobotsText;
