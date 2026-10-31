import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getPostLoginPath, snoozePasskeyPrompt } from "./passkeys";

beforeEach(() => {
	vi.stubGlobal("PublicKeyCredential", class {});
	localStorage.clear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const search = (redirect: string) => `?${new URLSearchParams({ redirect })}`;

test("logins stop at the passkey prompt, then carry on to where they were heading", () => {
	expect(getPostLoginPath(search("/admin/media"))).toBe(
		"/admin/passkey?redirect=%2Fadmin%2Fmedia",
	);
});

test("a login that started on the prompt doesn't wrap it again", () => {
	const fromPrompt = search("/admin/passkey?redirect=%2Fadmin%2Fmedia");
	expect(getPostLoginPath(fromPrompt)).toBe(
		"/admin/passkey?redirect=%2Fadmin%2Fmedia",
	);

	snoozePasskeyPrompt();
	expect(getPostLoginPath(fromPrompt)).toBe("/admin/media");
});

test("the prompt is skipped when its path is too long for the server, or passkeys aren't supported", () => {
	expect(getPostLoginPath(search(`/admin/${"a".repeat(2030)}`))).toBe(
		`/admin/${"a".repeat(2030)}`,
	);

	vi.stubGlobal("PublicKeyCredential", undefined);
	expect(getPostLoginPath(search("/admin/media"))).toBe("/admin/media");
});
