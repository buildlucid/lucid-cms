import { defineSeed } from "@lucidcms/core";
import { recordRun } from "../records.ts";

/** Found by its folder and named after its file, as a seed in a project's `database/seeds` is. */
export default defineSeed({
	run: ({ context }) => recordRun(context, "harness-file"),
});
