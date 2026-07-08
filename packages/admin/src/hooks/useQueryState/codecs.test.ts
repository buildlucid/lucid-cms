import { describe, expect, it } from "vitest";
import {
	arrayFilter,
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "./codecs";

describe("textFilter", () => {
	const codec = textFilter();

	it("parses raw strings as-is", () => {
		expect(codec.parse("hello")).toBe("hello");
		expect(codec.parse("")).toBe("");
	});

	it("serialises values and treats blank strings as empty", () => {
		expect(codec.serialize("hello")).toBe("hello");
		expect(codec.serialize("")).toBeUndefined();
		expect(codec.serialize("   ")).toBeUndefined();
		expect(codec.serialize(undefined)).toBeUndefined();
	});

	it("detects empty values", () => {
		expect(codec.isEmpty("")).toBe(true);
		expect(codec.isEmpty(undefined)).toBe(true);
		expect(codec.isEmpty("a")).toBe(false);
	});

	it("treats undefined and empty string as equal", () => {
		expect(codec.equals("", undefined)).toBe(true);
		expect(codec.equals("a", "a")).toBe(true);
		expect(codec.equals("a", "b")).toBe(false);
	});

	it("supports custom defaults", () => {
		const withDefault = textFilter({ defaultValue: "hello" });
		expect(withDefault.defaultValue).toBe("hello");
	});
});

describe("numberFilter", () => {
	const codec = numberFilter();

	it("parses numeric strings to numbers", () => {
		expect(codec.parse("42")).toBe(42);
		expect(codec.parse("abc")).toBe("abc");
		expect(codec.parse("")).toBeUndefined();
	});

	it("normalises numeric strings", () => {
		expect(codec.normalize("42")).toBe(42);
		expect(codec.normalize(42)).toBe(42);
		expect(codec.normalize("")).toBeUndefined();
	});

	it("serialises numbers to strings", () => {
		expect(codec.serialize(42)).toBe("42");
		expect(codec.serialize(undefined)).toBeUndefined();
	});
});

describe("booleanFilter", () => {
	const codec = booleanFilter();

	it("parses 1/0 to booleans", () => {
		expect(codec.parse("1")).toBe(true);
		expect(codec.parse("0")).toBe(false);
		expect(codec.parse("other")).toBeUndefined();
	});

	it("serialises booleans as 1/0", () => {
		expect(codec.serialize(true)).toBe("1");
		expect(codec.serialize(false)).toBe("0");
		expect(codec.serialize(undefined)).toBeUndefined();
	});

	it("does not treat false as empty", () => {
		expect(codec.isEmpty(false)).toBe(false);
		expect(codec.isEmpty(true)).toBe(false);
		expect(codec.isEmpty(undefined)).toBe(true);
	});

	it("normalises 1/0 style values", () => {
		expect(codec.normalize("1")).toBe(true);
		expect(codec.normalize(0)).toBe(false);
		expect(codec.normalize("")).toBeUndefined();
	});
});

describe("arrayFilter", () => {
	const codec = arrayFilter();

	it("parses comma-separated values with numeric coercion", () => {
		expect(codec.parse("1,2,three")).toEqual([1, 2, "three"]);
		expect(codec.parse("")).toEqual([]);
	});

	it("serialises arrays comma-separated and empty arrays as undefined", () => {
		expect(codec.serialize([1, 2])).toBe("1,2");
		expect(codec.serialize([])).toBeUndefined();
		expect(codec.serialize(undefined)).toBeUndefined();
	});

	it("normalises scalars and blank strings", () => {
		expect(codec.normalize("image")).toEqual(["image"]);
		expect(codec.normalize("")).toEqual([]);
		expect(codec.normalize(undefined)).toEqual([]);
		expect(codec.normalize(true)).toEqual([1]);
	});

	it("compares values element-wise regardless of type", () => {
		expect(codec.equals([1, 2], ["1", "2"])).toBe(true);
		expect(codec.equals([1], [1, 2])).toBe(false);
		expect(codec.equals([], undefined)).toBe(true);
	});

	it("carries a default operator", () => {
		const withOperator = arrayFilter({ defaultOperator: "in" });
		expect(withOperator.defaultOperator).toBe("in");
	});
});

describe("sort", () => {
	it("defaults to no direction", () => {
		expect(sort().defaultValue).toBeUndefined();
		expect(sort({ defaultValue: "desc" }).defaultValue).toBe("desc");
	});
});

describe("pagination", () => {
	it("applies default page and perPage", () => {
		expect(pagination()).toEqual({
			kind: "pagination",
			defaultPage: 1,
			defaultPerPage: 10,
		});
		expect(pagination({ defaultPerPage: 20 }).defaultPerPage).toBe(20);
	});
});
