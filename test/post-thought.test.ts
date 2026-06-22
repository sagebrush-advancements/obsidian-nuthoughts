import { describe, it, expect, mock } from "bun:test";

// The `obsidian` package is types-only (no runtime JS), so any module that
// imports from it must have it mocked before that module is loaded.
mock.module("obsidian", () => ({
	moment: (creationTime: number) => ({
		format: (fmt: string) => `moment:${creationTime}:${fmt}`,
	}),
	// Deterministic, easy-to-assert stand-in for Obsidian's YAML serializer.
	stringifyYaml: (obj: Record<string, unknown>) =>
		Object.entries(obj)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}\n`)
			.join(""),
}));

// Dynamic import so the mock above is registered before the module loads
// (static imports are hoisted and would run before mock.module).
const {
	convertValue,
	isValidFrontmatter,
	getDateTime,
	getFrontmatter,
} = await import("../src/server/routes/post-thought");

describe("convertValue", () => {
	it("converts a checkbox to a boolean", () => {
		expect(convertValue({ key: "done", value: "true", type: "checkbox" })).toBe(
			true
		);
		expect(
			convertValue({ key: "done", value: "false", type: "checkbox" })
		).toBe(false);
		expect(
			convertValue({ key: "done", value: "anything", type: "checkbox" })
		).toBe(false);
	});

	it("splits a list into a trimmed, empty-filtered array", () => {
		expect(
			convertValue({ key: "items", value: "a, b ,, c ", type: "list" })
		).toEqual(["a", "b", "c"]);
	});

	it("splits tags the same way as a list", () => {
		expect(
			convertValue({ key: "tags", value: "x, y", type: "tags" })
		).toEqual(["x", "y"]);
	});

	it("returns the raw string for text and unknown types", () => {
		expect(convertValue({ key: "note", value: "hello", type: "text" })).toBe(
			"hello"
		);
		expect(convertValue({ key: "note", value: "hello", type: "weird" })).toBe(
			"hello"
		);
	});
});

describe("isValidFrontmatter", () => {
	it("accepts a well-formed array of items", () => {
		expect(
			isValidFrontmatter([{ key: "k", value: "v", type: "text" }])
		).toBe(true);
		expect(isValidFrontmatter([])).toBe(true);
	});

	it("rejects non-arrays", () => {
		expect(isValidFrontmatter(null)).toBe(false);
		expect(isValidFrontmatter({})).toBe(false);
		expect(isValidFrontmatter("nope")).toBe(false);
	});

	it("rejects items with missing or non-string fields", () => {
		expect(isValidFrontmatter([{ key: "k", value: "v" }])).toBe(false);
		expect(
			isValidFrontmatter([{ key: 1, value: "v", type: "text" }])
		).toBe(false);
		expect(
			isValidFrontmatter([{ key: "k", value: 2, type: "text" }])
		).toBe(false);
		expect(isValidFrontmatter([null])).toBe(false);
	});
});

describe("getDateTime", () => {
	it("formats the creation time with the expected pattern", () => {
		expect(getDateTime(1700000000000)).toBe(
			"moment:1700000000000:YYYY-MM-DDTHH:mm:ss"
		);
	});
});

describe("getFrontmatter", () => {
	it("always includes the creation timestamp and wraps in fences", () => {
		const out = getFrontmatter(1700000000000, null, undefined);
		expect(out.startsWith("---\n")).toBe(true);
		expect(out.endsWith("---")).toBe(true);
		expect(out).toContain(
			'creation: "moment:1700000000000:YYYY-MM-DDTHH:mm:ss"'
		);
	});

	it("includes project only when truthy", () => {
		expect(getFrontmatter(1, "my-project", undefined)).toContain(
			'project: "my-project"'
		);
		expect(getFrontmatter(1, null, undefined)).not.toContain("project:");
		expect(getFrontmatter(1, undefined, undefined)).not.toContain("project:");
	});

	it("appends converted frontmatter items as keys", () => {
		const out = getFrontmatter(1, null, [
			{ key: "done", value: "true", type: "checkbox" },
			{ key: "tags", value: "a, b", type: "tags" },
		]);
		expect(out).toContain("done: true");
		expect(out).toContain('tags: ["a","b"]');
	});
});
