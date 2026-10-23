import type { ViteBuilder } from "vite";

/** Builds the client first so server environments can use its output, such as plugin asset manifests, through `builder.buildApp` retained by runtime integrations. */
const buildApp = async (builder: ViteBuilder) => {
	const { client, ...others } = builder.environments;
	if (client && !client.isBuilt) await builder.build(client);
	for (const environment of Object.values(others)) {
		if (!environment.isBuilt) await builder.build(environment);
	}
};

export default buildApp;
