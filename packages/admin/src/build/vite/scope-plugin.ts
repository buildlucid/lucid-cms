import type { Plugin } from "vite";

/** Restricts compiler plugins such as Solid and Tailwind to client modules accepted by `include`, protecting host code in the shared environment. */
const scopePlugin = (
	plugin: Plugin,
	include: (id: string) => boolean,
): Plugin => {
	const { transform, configEnvironment } = plugin;

	return {
		...plugin,
		applyToEnvironment: (environment) => environment.name === "client",
		...(configEnvironment && {
			configEnvironment(name, config, env) {
				if (name !== "client") return;

				const handler =
					typeof configEnvironment === "function"
						? configEnvironment
						: configEnvironment.handler;
				return handler.call(this, name, config, env);
			},
		}),
		...(transform && {
			transform:
				typeof transform === "function"
					? function (code, id, options) {
							if (!include(id)) return null;
							return transform.call(this, code, id, options);
						}
					: {
							...transform,
							handler(code, id, options) {
								if (!include(id)) return null;
								return transform.handler.call(this, code, id, options);
							},
						},
		}),
	};
};

export default scopePlugin;
