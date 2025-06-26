#!/usr/bin/env node
import { Command } from "commander";
import packageJson from "../../../package.json" with { type: "json" };
import buildCommand from "./commands/build.js";
import devCommand from "./commands/dev.js";
import migrateCommand from "./commands/migrate.js";
import serveCommand from "./commands/serve.js";

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
	.action(buildCommand);

program
	.command("migrate")
	.description("Run database migrations")
	.action(migrateCommand);

program.parse();
