export type PluginOptions = {
	clientId: string;
	clientSecret: string;
	tenant?: "common" | "organizations" | "consumers" | string;
	enabled?: boolean;
};
