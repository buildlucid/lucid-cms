import path from "node:path";
import { afterEach, expect, test } from "vitest";
import assertOutputFolder from "./assert-output-folder.js";

const projectRoot = path.resolve("/project");
const platform = process.platform;

const check = (outDir: string) => () =>
	assertOutputFolder({
		outDir: path.join(projectRoot, outDir),
		projectRoot,
		siteRoot: path.join(projectRoot, "src/site"),
		publicFiles: [
			{
				name: "robots.txt",
				path: path.join(projectRoot, "public/robots.txt"),
			},
		],
	});

afterEach(() => {
	Object.defineProperty(process, "platform", { value: platform });
});

test.each([
	["the project root", "."],
	["a folder outside the project", "../elsewhere"],
	["the site folder", "src/site"],
	["a folder inside the site", "src/site/dist"],
	["a folder holding the site", "src"],
	["a folder holding public files", "public"],
])("refuses %s", (_, outDir) => {
	expect(check(outDir)).toThrow("site:build empties");
});

test("refuses the site folder spelled with other cases where disks ignore case", () => {
	Object.defineProperty(process, "platform", { value: "darwin" });
	expect(check("Src/Site")).toThrow("site:build empties");
});

test("accepts a folder of its own inside the project", () => {
	expect(check("dist-site")).not.toThrow();
});
