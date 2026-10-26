import hostedRegistry from "./hosted-registry.js";
import type { HostedLucid } from "./types.js";

/** Keeps the hosted instance `lucid:hosted` created, destroying the one it replaces, such as after the module reloads. */
const registerHostedLucid = (
	key: { configPath: string; environment: string },
	lucid: HostedLucid,
) => {
	let instances = hostedRegistry.get(key.configPath);
	if (!instances) {
		instances = new Map();
		hostedRegistry.set(key.configPath, instances);
	}

	const previous = instances.get(key.environment);
	instances.set(key.environment, lucid);
	if (previous && previous !== lucid) void previous.destroy();

	return lucid;
};

export default registerHostedLucid;
