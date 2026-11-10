import { execFileSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";
import confirm from "@inquirer/confirm";
import pc from "picocolors";
import applyVersion from "./apply-version.ts";
import planVersion from "./plan-version.ts";
import printChanges from "./print-changes.ts";
import promptVersion from "./prompt-version.ts";
import readWorkspace from "./read-workspace.ts";
import resolveVersion from "./resolve-version.ts";

const HELP = `
Sets one version on every Lucid package and on their dependencies on each other.

Usage
  npm run release                 Choose the release from a list
  npm run release -- minor        patch, minor, major or prerelease
  npm run release -- 1.0.0        An exact version
  npm run release:check           Fail when the packages do not share one version

Options
  --dry-run   Show what would change without writing
  --yes       Skip the confirmation
  --check     Only check that the packages share one version
`;

const root = path.resolve(import.meta.dirname, "../..");

/** Fails when any package's version, or dependency on another Lucid package, differs from core's. */
const check = () => {
	const workspace = readWorkspace(root);
	const problems = planVersion(workspace, workspace.version);

	if (problems.length === 0) {
		console.log(pc.green(`✓ Every package is at ${workspace.version}.`));
		return;
	}

	console.error(
		pc.red(`✗ ${problems.length} values do not match ${workspace.version}:`),
	);
	printChanges(problems);
	console.error(`\nRun ${pc.cyan("npm run release")} to bring them in line.`);
	process.exitCode = 1;
};

/** Chooses the next version, shows what it changes, then writes it and updates the lockfile. */
const release = async (options: {
	version?: string;
	dryRun: boolean;
	yes: boolean;
}) => {
	const workspace = readWorkspace(root);
	const version = options.version
		? resolveVersion(workspace.version, options.version)
		: await promptVersion(workspace.version);
	const changes = planVersion(workspace, version);
	const packages = workspace.versionedNames.size;

	console.log(
		`\n${pc.bold(`${workspace.version} → ${version}`)} across ${packages} packages:\n`,
	);
	printChanges(changes);

	if (options.dryRun) {
		console.log(pc.yellow("\nDry run. Nothing was written."));
		return;
	}
	if (!options.yes) {
		const confirmed = await confirm({ message: "Write these changes?" });
		if (!confirmed) {
			console.log("Nothing was written.");
			return;
		}
	}

	applyVersion(root, changes);
	console.log(pc.green(`\n✓ Set ${packages} packages to ${version}.`));

	try {
		execFileSync(
			"npm",
			["install", "--package-lock-only", "--ignore-scripts"],
			{
				cwd: root,
				stdio: "ignore",
			},
		);
		console.log(pc.green("✓ Updated package-lock.json."));
	} catch {
		console.log(
			pc.yellow("! Could not update package-lock.json. Run `npm install`."),
		);
	}

	console.log(
		`\nStill to do by hand: update the changelog headings, commit, and publish.`,
	);
};

const main = async () => {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			check: { type: "boolean", default: false },
			"dry-run": { type: "boolean", default: false },
			yes: { type: "boolean", short: "y", default: false },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		console.log(HELP);
		return;
	}
	if (values.check) {
		check();
		return;
	}

	await release({
		version: positionals[0],
		dryRun: values["dry-run"],
		yes: values.yes,
	});
};

try {
	await main();
} catch (error) {
	//* Ctrl+C in a prompt
	if (error instanceof Error && error.name === "ExitPromptError") {
		console.log("\nCancelled. Nothing was written.");
	} else {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exitCode = 1;
	}
}
