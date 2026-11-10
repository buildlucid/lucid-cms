/**
 * The admin URL of an extension route, from the `path` it was defined with.
 *
 * @example
 * ```tsx
 * import { adminHref } from "@lucidcms/admin/utils";
 *
 * <Link href={adminHref("reports/weekly")}>Weekly report</Link>;
 * ```
 */
export const adminHref = (path: string) =>
	`/admin/e/${path.replace(/^\/+|\/+$/g, "")}`;
