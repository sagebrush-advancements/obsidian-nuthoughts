import { describe, it, expect } from "bun:test";

import { validateFields } from "../src/server/validation";
import { InvalidTypesError } from "../src/server/validation/InvalidTypesError";

describe("validateFields", () => {
	it("passes when all field types match", () => {
		expect(() =>
			validateFields([
				{ name: "createdAt", value: 123, expectedType: "number" },
				{ name: "content", value: "hello", expectedType: "string" },
				{ name: "flag", value: true, expectedType: "boolean" },
			])
		).not.toThrow();
	});

	it("throws InvalidTypesError on a type mismatch", () => {
		expect(() =>
			validateFields([
				{ name: "createdAt", value: "123", expectedType: "number" },
			])
		).toThrow(InvalidTypesError);
	});

	it("skips validation for an undefined optional value", () => {
		expect(() =>
			validateFields([
				{
					name: "project",
					value: undefined,
					expectedType: "string",
					isOptional: true,
				},
			])
		).not.toThrow();
	});

	it("throws when an undefined value is not optional", () => {
		expect(() =>
			validateFields([
				{ name: "content", value: undefined, expectedType: "string" },
			])
		).toThrow(InvalidTypesError);
	});

	it("collects every invalid field in the error message", () => {
		expect(() =>
			validateFields([
				{ name: "createdAt", value: "123", expectedType: "number" },
				{ name: "content", value: 5, expectedType: "string" },
			])
		).toThrow(
			"Invalid type on fields: [createdAt,content]. Received: [string,number]. Expected: [number,string]."
		);
	});
});

describe("InvalidTypesError", () => {
	it("formats the message from the invalid fields", () => {
		const err = new InvalidTypesError([
			{ name: "createdAt", value: "123", expectedType: "number" },
		]);
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("InvalidTypesError");
		expect(err.message).toBe(
			"Invalid type on fields: [createdAt]. Received: [string]. Expected: [number]."
		);
	});
});
