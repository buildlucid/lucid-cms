/** Credentials and availability for Microsoft sign-in. */
export type PluginOptions = {
	/** Client ID from the provider application. */
	clientId: string;
	/** Client secret from the provider application. Keep this in server environment variables. */
	clientSecret: string;
	/** Tenant ID or Microsoft tenant audience. Defaults to organizations. */
	tenant?: "common" | "organizations" | "consumers" | string;
	/** Offer this provider on the login screen. Defaults to true. */
	enabled?: boolean;
	/**
	 * Skip Lucid's two-factor step for Microsoft logins. Defaults to false for `common` and
	 * `consumers`, true for other tenants.
	 */
	bypassTwoFactor?: boolean;
};
