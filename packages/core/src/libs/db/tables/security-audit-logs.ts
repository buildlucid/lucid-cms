import type { ColumnType, Generated, JSONColumnType } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import type {
	SecurityAuditAction,
	SecurityAuditRoleSnapshot,
} from "../../../types/security-audit.js";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt, TimestampImmutable } from "../types.js";

export const securityAuditLogsTable = defineTable(
	"lucid_security_audit_logs",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			user_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			action: {
				schema: z.enum(constants.securityAudit.actions),
				type: "text",
			},
			performed_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			performed_by_roles: {
				schema: z.array(
					z.object({
						id: z.number(),
						name: z.string(),
					}),
				),
				type: "json",
			},
			performed_by_super_admin: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			ip_address: {
				schema: z.string(),
				type: "varchar",
				args: [255],
			},
			previous_value: {
				schema: z.string(),
				type: "text",
			},
			new_value: {
				schema: z.string(),
				type: "text",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
		query: {
			filters: {
				userId: "user_id",
				action: "action",
				performedBy: "performed_by",
			},
			sorts: {
				createdAt: "created_at",
			},
		} as const,
	}),
);

export interface LucidSecurityAuditLogs {
	id: Generated<number>;
	user_id: number | null;
	action: SecurityAuditAction;
	performed_by: number | null;
	performed_by_roles: JSONColumnType<
		SecurityAuditRoleSnapshot[],
		SecurityAuditRoleSnapshot[],
		SecurityAuditRoleSnapshot[]
	>;
	performed_by_super_admin: ColumnType<
		BooleanInt,
		BooleanInt | undefined,
		BooleanInt
	>;
	ip_address: string;
	previous_value: string;
	new_value: string;
	created_at: TimestampImmutable;
}
