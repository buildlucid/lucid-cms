import type { LucidDatabase } from "../db/client/index.js";
import { securityAuditLogsTable } from "../db/tables/security-audit-logs.js";
import StaticRepository from "./parents/static-repository.js";

export default class SecurityAuditLogsRepository extends StaticRepository<"lucid_security_audit_logs"> {
	constructor(db: LucidDatabase) {
		super(db, securityAuditLogsTable);
	}
}
