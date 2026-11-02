import z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import { getLucidRemotePublicClient } from "../../public-client.js";

const announcementSchema = z.object({
	publicId: z.string().min(1),
	type: z.enum(["announcement", "security"]),
	title: z.string().min(1),
	message: z.string(),
	url: z.string().nullable(),
	/** A semver range of `@lucidcms/core` versions, or null for every version. */
	lucidVersions: z.string().nullable(),
});

export type RemoteAnnouncement = z.infer<typeof announcementSchema>;

const responseSchema = z.object({ data: z.array(z.unknown()) });

//* a stalled request would hold the sync job's lease
const TIMEOUT_MS = 10_000;

/**
 * Fetches public announcements, adding organisation and connection announcements when
 * authenticated. Public requests omit the CMS origin. Skips unsupported items.
 */
const getAnnouncements: ServiceFn<
	[{ accessToken: string | null }],
	RemoteAnnouncement[]
> = async (context, input) => {
	let json: unknown;
	if (input.accessToken) {
		const result = await getLucidRemoteClient(context).request<unknown>(
			lucidRemotePaths.getAnnouncements,
			{
				method: "GET",
				retries: 0,
				accessToken: input.accessToken,
				signal: AbortSignal.timeout(TIMEOUT_MS),
			},
		);
		if (result.error) return result;
		json = result.data.json;
	} else {
		json = await getLucidRemotePublicClient(context.env).get(
			lucidRemotePaths.getPublicAnnouncements,
			{ timeoutMs: TIMEOUT_MS },
		);
	}

	const parsed = responseSchema.safeParse(json);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.lucid.remote.request.failed", {
					defaultMessage: "Lucid remote request failed.",
				}),
			},
		};
	}

	return {
		error: undefined,
		data: parsed.data.data.flatMap((item) => {
			const announcement = announcementSchema.safeParse(item);
			return announcement.success ? [announcement.data] : [];
		}),
	};
};

export default getAnnouncements;
