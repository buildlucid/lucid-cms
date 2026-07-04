import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Config } from "../../../types.js";
import loadEmailTemplates from "./load-email-templates.js";

let templateDirectory: string;

const createConfig = (): Config =>
	({
		email: {
			templates: {
				directory: templateDirectory,
			},
		},
	}) as Config;

describe("loadEmailTemplates", () => {
	beforeEach(async () => {
		templateDirectory = await mkdtemp(
			path.join(tmpdir(), "lucid-email-templates-"),
		);
	});

	afterEach(async () => {
		await rm(templateDirectory, { recursive: true, force: true });
	});

	test("loads supported HTML and Mustache template files", async () => {
		await Promise.all([
			writeFile(path.join(templateDirectory, "welcome.html"), "<p>Welcome</p>"),
			writeFile(
				path.join(templateDirectory, "receipt.mustache"),
				"<p>Receipt</p>",
			),
			writeFile(path.join(templateDirectory, "ignored.hbs"), "<p>Ignored</p>"),
			writeFile(
				path.join(templateDirectory, "ignored.handlebars"),
				"<p>Ignored</p>",
			),
			writeFile(path.join(templateDirectory, "ignored.txt"), "<p>Ignored</p>"),
		]);

		const result = await loadEmailTemplates({
			config: createConfig(),
			silent: true,
		});

		expect(result.welcome?.html).toBe("<p>Welcome</p>");
		expect(result.receipt?.html).toBe("<p>Receipt</p>");
		expect(result.ignored).toBeUndefined();
		expect(result.welcome?.lastModified).toEqual(expect.any(String));
	});

	test("uses project templates before packaged defaults", async () => {
		await writeFile(
			path.join(templateDirectory, "reset-password.mustache"),
			"<p>Project reset password</p>",
		);

		const result = await loadEmailTemplates({
			config: createConfig(),
			silent: true,
		});

		expect(result["reset-password"]?.html).toBe(
			"<p>Project reset password</p>",
		);
		expect(result["user-invite"]?.html).toContain("Accept invitation");
	});
});
