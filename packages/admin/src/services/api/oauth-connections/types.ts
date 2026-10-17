export type OAuthConnectionOwner =
	| { type: "system" }
	| { type: "account" }
	| { type: "user"; userId: number };

export const getOAuthConnectionsPath = (owner: OAuthConnectionOwner) => {
	switch (owner.type) {
		case "system":
			return "/api/v1/integrations/oauth";
		case "account":
			return "/api/v1/account/oauth-connections";
		case "user":
			return `/api/v1/users/${owner.userId}/oauth-connections`;
	}
};
