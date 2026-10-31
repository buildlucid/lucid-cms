import type z from "zod";
import jobsListTask from "./jobs-list.js";
import jobsScheduleTask from "./jobs-schedule.js";
import migrateResetTask from "./migrate-reset.js";
import migrateRollbackTask from "./migrate-rollback.js";
import migrateStatusTask from "./migrate-status.js";
import migrateTask from "./migrate.js";
import pluginTask from "./plugin.js";
import seedListTask from "./seed-list.js";
import seedTask from "./seed.js";
import syncTask from "./sync.js";
import usersResetTwoFactorTask from "./users-reset-two-factor.js";
import usersSuperAdminTask from "./users-super-admin.js";

/** Lucid's runtime tasks, keyed by the name their route ends with: `/__lucid/tasks/<name>`. */
const runtimeTasks = {
	migrate: migrateTask,
	"migrate:status": migrateStatusTask,
	"migrate:rollback": migrateRollbackTask,
	"migrate:reset": migrateResetTask,
	sync: syncTask,
	"seed:list": seedListTask,
	seed: seedTask,
	"jobs:list": jobsListTask,
	"jobs:schedule": jobsScheduleTask,
	"users:reset-two-factor": usersResetTwoFactorTask,
	"users:super-admin": usersSuperAdminTask,
	plugin: pluginTask,
};

export type RuntimeTasks = typeof runtimeTasks;
export type RuntimeTaskName = keyof RuntimeTasks;
export type RuntimeTaskInput<Name extends RuntimeTaskName> = z.input<
	RuntimeTasks[Name]["input"]
>;
export type RuntimeTaskResult<Name extends RuntimeTaskName> = Awaited<
	ReturnType<RuntimeTasks[Name]["run"]>
>;

export default runtimeTasks;
