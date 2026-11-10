import input from "@inquirer/input";
import select from "@inquirer/select";
import pc from "picocolors";
import getBumpOptions from "./get-bump-options.ts";
import resolveVersion from "./resolve-version.ts";

const CUSTOM = "custom";

/** Asks which kind of release this is and returns its version, or asks for one for a custom release. */
const promptVersion = async (current: string): Promise<string> => {
	const choice = await select({
		message: `Lucid is at ${pc.cyan(current)}. What kind of release is this?`,
		choices: [
			...getBumpOptions(current).map((option) => ({
				name: `${option.type.padEnd(11)} ${pc.cyan(option.version)}`,
				value: option.version,
				description: option.description,
			})),
			{
				name: "custom",
				value: CUSTOM,
				description: "Type the version, such as 1.0.0-beta.0",
			},
		],
	});
	if (choice !== CUSTOM) {
		return choice;
	}

	const typed = await input({
		message: "Version:",
		validate: (value) => {
			try {
				resolveVersion(current, value.trim());
				return true;
			} catch (error) {
				return error instanceof Error ? error.message : "Invalid version.";
			}
		},
	});

	return resolveVersion(current, typed.trim());
};

export default promptVersion;
