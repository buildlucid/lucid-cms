import hostedRegistry from "./hosted-registry.js";

/** Destroys the hosted instances a project's server environments created, once its dev server closes. */
const destroyHostedLucids = async (configPath: string) => {
	const instances = hostedRegistry.get(configPath);
	if (!instances) return;

	hostedRegistry.delete(configPath);
	await Promise.allSettled(
		Array.from(instances.values(), (lucid) => lucid.destroy()),
	);
};

export default destroyHostedLucids;
