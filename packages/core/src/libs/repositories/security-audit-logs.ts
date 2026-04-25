import z from "zod";
import constants from "../../constants/constants.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class SecurityAuditLogsRepository extends StaticRepository<"lucid_security_audit_logs"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_security_audit_logs");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number().nullable(),
		action: z.enum(constants.securityAudit.actions),
		performed_by: z.number().nullable(),
		performed_by_roles: z.array(
			z.object({
				id: z.number(),
				name: z.string(),
			}),
		),
		performed_by_super_admin: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		ip_address: z.string(),
		previous_value: z.string(),
		new_value: z.string(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		action: this.dbAdapter.getDataType("text"),
		performed_by: this.dbAdapter.getDataType("integer"),
		performed_by_roles: this.dbAdapter.getDataType("json"),
		performed_by_super_admin: this.dbAdapter.getDataType("boolean"),
		ip_address: this.dbAdapter.getDataType("varchar", 255),
		previous_value: this.dbAdapter.getDataType("text"),
		new_value: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				userId: "user_id",
				action: "action",
				performedBy: "performed_by",
			},
			sorts: {
				createdAt: "created_at",
			},
		},
	} as const;
}
