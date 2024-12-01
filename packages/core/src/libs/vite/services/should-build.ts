import getBuildMetadata from "./get-build-metadata.js";

/**
 * Determines if we need to build the admin SPA. Build if:
 * - lucid was started with the --no-cache argument
 * - there is no built version currently
 * - the users lucid.config.ts/js file has been changed since last build
 * - the user CWD package.json has been updated since last build
 * - @lucidcms/admin package.json version has been updated since
 * @todo add logging to any throw errors of resposne
 */
const shouldBuild = async (cwd = process.cwd()): Promise<boolean> => {
	try {
		const buildMetadata = await getBuildMetadata();

		return true;
	} catch (err) {
		return true;
	}
};

export default shouldBuild;
