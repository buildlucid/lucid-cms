import type { ResolvedLucidConfig } from "../../types/config.js";

/**
 * Resolves the display brand name for emails.
 */
const resolveEmailBrandName = (props: {
	config: Pick<ResolvedLucidConfig, "brand">;
}) => {
	const brandName = props.config.brand.name.trim();
	if (brandName) return brandName;

	return undefined;
};

export default resolveEmailBrandName;
