/** The runtime's `HostedLucid` for the project, which Lucid's Vite plugin serves to Astro's server environments. */
declare module "lucid:hosted" {
	import type { HostedLucid } from "@lucidcms/core/types";

	const lucid: HostedLucid;
	export default lucid;
}
