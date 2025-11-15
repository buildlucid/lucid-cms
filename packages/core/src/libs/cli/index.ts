#!/usr/bin/env node
import { Command } from "commander";
import packageJson from "../../../package.json" with { type: "json" };
import buildCommand from "./commands/build.js";
import devCommand from "./commands/dev.js";
import migrateCommand from "./commands/migrate.js";
import serveCommand from "./commands/serve.js";
import migrateRollbackCommand from "./commands/migrate-rollback.js";
import migrateResetCommand from "./commands/migrate-reset.js";
import migrateFreshCommand from "./commands/migrate-fresh.js";

// TODO: split this into 3 seperate exports and scripts, one for node, one for bun, one for deno. lucidcms:node, lucidcms:bun, lucidcms:deno
const program = new Command();

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
	.action(devCommand);

program
	.command("serve")
	.description("Serve the application")
	.action(serveCommand);

program
	.command("build")
	.description("Build for production")
	.option(
		"--cache-spa",
		"Skip clearing SPA build output during clean. The SPA will only be rebuilt when changes are detected.",
	)
	.option("--silent", "Suppress all logging output")
	.action(buildCommand);

program
	.command("migrate")
	.description("Run database migrations")
	.option("-f, --force", "Skip confirmation prompt")
	.action(
		// @ts-expect-error
		migrateCommand({ mode: "process" }),
	);

program
	.command("migrate:rollback")
	.description("Rollback the last database migration")
	.option("-s, --steps <number>", "Number of migrations to rollback", "1")
	.option("-f, --force", "Skip confirmation prompt")
	.action(migrateRollbackCommand);

program
	.command("migrate:reset")
	.description("Drop all database tables")
	.option("-f, --force", "Skip confirmation prompt")
	.action(
		// @ts-expect-error
		migrateResetCommand({ mode: "process" }),
	);

program
	.command("migrate:fresh")
	.description("Drop all tables and re-run all migrations")
	.option("-f, --force", "Skip confirmation prompt")
	.action(migrateFreshCommand);

program.parse();
