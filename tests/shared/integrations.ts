import type { Session } from "../harness/src/client/types.ts";
import { uniqueName } from "./permissions.ts";

export type Integration = {
	id: number;
	key: string;
	name: string;
	description: string | null;
	enabled: boolean;
	userId: number | null;
	scopes: string[];
	expiresAt: string | null;
	lastUsedAt: string | null;
};

/** Where site keys live, and where a signed-in person's own keys live. */
export const KEY_PATHS = {
	site: "/api/v1/integrations",
	personal: "/api/v1/account/integrations",
} as const;

/** The short key an API key's secret carries, which the CMS lists it by. */
export const readKeyId = (apiKey: string) =>
	Buffer.from(apiKey.replace(/^lucid_int_/, ""), "base64url")
		.toString()
		.split(":")[0] ?? "";

/**
 * Makes a site or personal API key as the session, and returns its ID with the secret, which the
 * CMS shows only once.
 */
export const createApiKey = async (
	session: Session,
	kind: keyof typeof KEY_PATHS,
	body: { scopes: string[]; expiry?: string; enabled?: boolean; name?: string },
): Promise<{ id: number; apiKey: string }> => {
	const path = KEY_PATHS[kind];
	const created = await session.request<{ data: { apiKey: string } }>({
		method: "POST",
		path,
		body: { name: uniqueName("API key"), ...body },
	});
	if (!created.ok) {
		throw new Error(
			`Creating a ${kind} API key answered ${created.status}: ${JSON.stringify(created.body)}`,
		);
	}
	const apiKey = created.body.data.apiKey;
	const listed = await session.request<{ data: Integration[] }>({
		path,
		query: { "filter[key]": readKeyId(apiKey) },
	});
	const id = listed.body.data[0]?.id;
	if (id === undefined) {
		throw new Error(`The new ${kind} API key isn't listed.`);
	}
	return { id, apiKey };
};
