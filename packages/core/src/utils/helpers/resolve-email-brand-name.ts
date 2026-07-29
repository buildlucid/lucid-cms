import type { Config } from "../../types/config.js";

/**
 * Resolves the display brand name for emails.
 */
const resolveEmailBrandName = (props: { config: Pick<Config, "brand"> }) => {
	const brandName = props.config.brand.name.trim();
	if (brandName) return brandName;

	return undefined;
};

export default resolveEmailBrandName;
