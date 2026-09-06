import type { LucidConfig } from "../../../types/config.js";
import LucidError from "../../../utils/errors/lucid-error.js";

const getProviders = (config: Partial<LucidConfig>) =>
	[
		["media.storage", config.media?.storage],
		["media.delivery", config.media?.delivery],
		["email.adapter", config.email?.adapter],
		["kv.adapter", config.kv?.adapter],
		["queue.adapter", config.queue?.adapter],
	] as const;

/** Tracks exclusive providers supplied by plugins during one config resolution. */
const createProviderRegistry = () => {
	const owners = new Map<string, string>();
	return (
		plugin: string,
		config: Partial<LucidConfig>,
		previous?: Partial<LucidConfig>,
	) => {
		const previousProviders =
			previous && new Map<string, unknown>(getProviders(previous));
		for (const [slot, adapter] of getProviders(config)) {
			if (adapter === undefined || previousProviders?.get(slot) === adapter)
				continue;
			const owner = owners.get(slot);
			if (owner && owner !== plugin) {
				throw new LucidError({
					message: `Plugins "${owner}" and "${plugin}" both provide ${slot}. Choose one provider.`,
				});
			}
			owners.set(slot, plugin);
		}
	};
};

export default createProviderRegistry;
