import type { LucidDatabase } from "../db/client/index.js";
import { oauthClientRedirectUrisTable } from "../db/tables/oauth-client-redirect-uris.js";
import StaticRepository from "./parents/static-repository.js";

export default class OAuthClientRedirectUrisRepository extends StaticRepository<"lucid_oauth_client_redirect_uris"> {
	constructor(db: LucidDatabase) {
		super(db, oauthClientRedirectUrisTable);
	}
}
