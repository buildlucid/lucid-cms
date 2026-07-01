#!/usr/bin/env node
import { Command } from "commander";
import packageJson from "../../../package.json" with { type: "json" };
import buildCommand from "./commands/build.js";
import cronCommand from "./commands/cron.js";
import devCommand from "./commands/dev.js";
import migrateCommand from "./commands/migrate.js";
import migrateFreshCommand from "./commands/migrate-fresh.js";
import migrateNewCommand from "./commands/migrate-new.js";
import migrateResetCommand from "./commands/migrate-reset.js";
import migrateRollbackCommand from "./commands/migrate-rollback.js";
import migrateStatusCommand from "./commands/migrate-status.js";
import serveCommand from "./commands/serve.js";
import syncCommand from "./commands/sync.js";
import typegenCommand from "./commands/typegen.js";

// TODO: split this into 3 seperate exports and scripts, one for node, one for bun, one for deno. lucidcms:node, lucidcms:bun, lucidcms:deno
const program = new Command();
const remoteOptionDescription = "Use remote runtime resources when supported";

program
	.name("lucidcms")
	.description("Lucid CMS CLI")
	.version(packageJson.version);

program
	.command("dev")
	.description("Start development server")
	.option(
		"-w, --watch [path]",
		"Watch for file changes (optionally specify path to watch)",
	)
	.option("--remote", remoteOptionDescription)
	.action(devCommand);

program
	.command("serve")
	.description("Serve the application")
	.option("--remote", remoteOptionDescription)
	.action(serveCommand);

program
	.command("build")
	.description("Build for production")
	.option(
		"--cache-spa",
		"Skip clearing SPA build output during clean. The SPA will only be rebuilt when changes are detected.",
	)
	.option("--silent", "Suppress all logging output")
	.option("--remote", remoteOptionDescription)
	.action(buildCommand);

program
	.command("typegen")
	.description("Generate Lucid type files")
	.option("--remote", remoteOptionDescription)
	.action(typegenCommand);

program
	.command("migrate")
	.description("Run database migrations (also runs sync as a side effect)")
	.option("-f, --force", "Skip confirmation prompt")
	.option("--remote", remoteOptionDescription)
	.action(
		// @ts-expect-error
		migrateCommand({ mode: "process" }),
	);

program
	.command("sync")
	.description("Run sync")
	.option("--remote", remoteOptionDescription)
	.action(syncCommand);

program
	.command("migrate:status")
	.description("Show pending migrations and migration history health")
	.option(
		"--check",
		"Exit with a non-zero code when migrations are pending or history is unhealthy",
	)
	.option("--remote", remoteOptionDescription)
	.action(migrateStatusCommand);

program
	.command("migrate:rollback")
	.description("Rollback the last database migration")
	.option("-s, --steps <number>", "Number of migrations to rollback", "1")
	.option("-f, --force", "Skip confirmation prompt")
	.option("--remote", remoteOptionDescription)
	.action(migrateRollbackCommand);

program
	.command("migrate:reset")
	.description("Drop all database tables")
	.option("-f, --force", "Skip confirmation prompt")
	.option("--remote", remoteOptionDescription)
	.action(
		// @ts-expect-error
		migrateResetCommand({ mode: "process" }),
	);

program
	.command("migrate:new <name>")
	.description("Create a new timestamped migration file")
	.action(migrateNewCommand);

program
	.command("migrate:fresh")
	.description("Drop all tables and re-run all migrations")
	.option("-f, --force", "Skip confirmation prompt")
	.option("--remote", remoteOptionDescription)
	.action(migrateFreshCommand);

program
	.command("cron [job]")
	.description("Run a cron job manually")
	.option("--remote", remoteOptionDescription)
	.action(cronCommand);

program.parse();
