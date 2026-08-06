import type { LucidDatabase } from "../db/client/index.js";
import { userLoginsTable } from "../db/tables/user-logins.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserLoginsRepository extends StaticRepository<"lucid_user_logins"> {
	constructor(db: LucidDatabase) {
		super(db, userLoginsTable);
	}
}
