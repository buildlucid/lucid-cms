import type { LucidDatabase } from "../db/client/index.js";
import { oauthGrantScopesTable } from "../db/tables/oauth-grant-scopes.js";
import StaticRepository from "./parents/static-repository.js";

export default class OAuthGrantScopesRepository extends StaticRepository<"lucid_oauth_grant_scopes"> {
	constructor(db: LucidDatabase) {
		super(db, oauthGrantScopesTable);
	}
}
