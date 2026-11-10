import confirm from "@inquirer/confirm";
import { LucidError } from "../../../utils/errors/index.js";
import runPrompt from "./run-prompt.js";

/** Confirms data changes unless `--yes` is set. Fails without an interactive terminal. */
const confirmCommand = async (props: { message: string; yes?: boolean }) => {
	if (props.yes) return true;
	if (!process.stdin.isTTY) {
		throw new LucidError({
			message:
				"This command needs confirming, and there's no terminal to ask in. Re-run it with --yes to confirm.",
		});
	}

	return runPrompt((output) =>
		confirm({ message: props.message, default: false }, { output }),
	);
};

export default confirmCommand;
