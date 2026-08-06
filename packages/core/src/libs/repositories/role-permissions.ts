import type { LucidDatabase } from "../db/client/index.js";
import { rolePermissionsTable } from "../db/tables/role-permissions.js";
import StaticRepository from "./parents/static-repository.js";

export default class RolePermissionsRepository extends StaticRepository<"lucid_role_permissions"> {
	constructor(db: LucidDatabase) {
		super(db, rolePermissionsTable);
	}
}
