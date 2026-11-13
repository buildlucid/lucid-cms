import { expect, test } from "vitest";
import getUrlHosts from "./get-url-hosts.js";

test("answers to the scheme's default port, and only to an explicit port otherwise", () => {
	expect(getUrlHosts("https://example.fr:443/")).toEqual([
		"example.fr",
		"example.fr:443",
	]);
	expect(getUrlHosts("http://example.fr")).toEqual([
		"example.fr",
		"example.fr:80",
	]);
	expect(getUrlHosts("https://example.fr:8443")).toEqual(["example.fr:8443"]);
});
