import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { collectResourceFiles } from "../../resources/collect-files.js";
import loadEmailTemplates from "./load-email-templates.js";

let templateDirectory: string;

describe("loadEmailTemplates", () => {
	beforeEach(async () => {
		templateDirectory = await mkdtemp(
			path.join(tmpdir(), "lucid-email-templates-"),
		);
	});

	afterEach(async () => {
		await rm(templateDirectory, { recursive: true, force: true });
	});

	test("loads Kiln template files", async () => {
		await Promise.all([
			writeFile(path.join(templateDirectory, "welcome.kiln"), "<p>Welcome</p>"),
			writeFile(path.join(templateDirectory, "receipt.kiln"), "<p>Receipt</p>"),
			writeFile(path.join(templateDirectory, "ignored.html"), "<p>Ignored</p>"),
			writeFile(path.join(templateDirectory, "ignored.txt"), "<p>Ignored</p>"),
		]);

		const result = await loadEmailTemplates({
			files: await collectResourceFiles(templateDirectory),
			silent: true,
		});

		expect(result.welcome?.html).toBe("<p>Welcome</p>");
		expect(result.receipt?.html).toBe("<p>Receipt</p>");
		expect(result.ignored).toBeUndefined();
		expect(result.welcome?.lastModified).toEqual(expect.any(String));
	});

	test("uses project templates before packaged defaults", async () => {
		await writeFile(
			path.join(templateDirectory, "reset-password.kiln"),
			"<p>Project reset password</p>",
		);

		const result = await loadEmailTemplates({
			files: await collectResourceFiles(templateDirectory),
			silent: true,
		});

		expect(result["reset-password"]?.html).toBe(
			"<p>Project reset password</p>",
		);
		expect(result["user-invite"]?.html).toContain("Accept invitation");
	});
});
