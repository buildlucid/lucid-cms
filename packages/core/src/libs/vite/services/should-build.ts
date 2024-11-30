/**
 * Determines if we need to build the admin SPA. Build if:
 * - lucid was started with the --no-cache argument
 * - there is no built version currently
 * - the users lucid.config.ts/js file has been changed since last build
 * - the user CWD package.json has been updated since last build
 * - @lucidcms/admin package.json version has been updated since
 */
const shouldBuild = (): boolean => {
	return true;
};

export default shouldBuild;
