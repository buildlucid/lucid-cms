import type { LucidDatabase } from "../db/client/index.js";
import { integrationScopesTable } from "../db/tables/integration-scopes.js";
import StaticRepository from "./parents/static-repository.js";

export default class IntegrationScopesRepository extends StaticRepository<"lucid_integration_scopes"> {
	constructor(db: LucidDatabase) {
		super(db, integrationScopesTable);
	}
}
