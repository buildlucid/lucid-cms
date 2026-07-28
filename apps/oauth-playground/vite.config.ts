import { defineConfig, loadEnv, type Plugin } from "vite";

const metadataPath = "/oauth-client.json";

const getClientMetadata = (origin: string) => ({
	client_id: `${origin}${metadataPath}`,
	client_name: "Lucid OAuth Playground",
	...(origin.startsWith("https:") ? { client_uri: origin } : {}),
	redirect_uris: [`${origin}/callback`],
	grant_types: ["authorization_code", "refresh_token"],
	response_types: ["code"],
	token_endpoint_auth_method: "none",
});

const clientMetadataPlugin = (origin: string): Plugin => {
	const source = JSON.stringify(getClientMetadata(origin), null, 2);

	return {
		name: "lucid-oauth-client-metadata",
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (request.url?.split("?")[0] !== metadataPath) {
					next();
					return;
				}

				response.statusCode = 200;
				response.setHeader("Content-Type", "application/json; charset=utf-8");
				response.setHeader("Cache-Control", "no-store");
				response.setHeader("X-Content-Type-Options", "nosniff");
				response.end(source);
			});
		},
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: metadataPath.slice(1),
				source,
			});
		},
	};
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const port = Number(env.OAUTH_PLAYGROUND_PORT ?? 5173);
	const clientOrigin = new URL(
		env.VITE_OAUTH_CLIENT_ORIGIN ?? `http://localhost:${port}`,
	).origin;

	return {
		plugins: [clientMetadataPlugin(clientOrigin)],
		server: {
			port,
			strictPort: true,
		},
		preview: {
			port,
			strictPort: true,
		},
	};
});
