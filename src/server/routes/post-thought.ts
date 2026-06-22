import { NextFunction, Request, Response } from "express";
import { moment, stringifyYaml } from "obsidian";
import { validateFields } from "../validation";

import * as path from "path";

import { App } from "obsidian";
import { NuThoughtsSettings } from "../../types";
import { FrontmatterItem, Thought } from "./types";

export const postThought = async (
	req: Request,
	res: Response,
	next: NextFunction,
	{
		obsidianApp,
		settings,
	}: {
		obsidianApp: App;
		settings: NuThoughtsSettings;
	}
) => {
	const { createdAt, content, project, frontmatter } = req.body;

	if (createdAt === undefined) {
		next("Missing field: createdAt");
		return;
	} else if (content === undefined) {
		next("Missing field: content");
		return;
	}

	try {
		validateFields([
			{
				name: "createdAt",
				value: createdAt,
				expectedType: "number",
			},
			{
				name: "content",
				value: content,
				expectedType: "string",
			},
		]);
	} catch (err) {
		next(err);
		return;
	}

	if (
		project !== undefined &&
		project !== null &&
		typeof project !== "string"
	) {
		next("Invalid field: project must be a string or null");
		return;
	}

	if (frontmatter !== undefined && !isValidFrontmatter(frontmatter)) {
		next(
			"Invalid field: frontmatter must be an array of { key, value, type } strings"
		);
		return;
	}

	const { saveFolder, shouldDebug } = settings;

	if (shouldDebug) {
		console.log("Received thought:", createdAt, content, project, frontmatter);
	}

	const filePath = await saveThought(
		obsidianApp,
		saveFolder,
		{
			createdAt,
			content,
			project,
			frontmatter,
		},
		next
	);
	if (filePath === null) {
		return;
	}

	res.status(201).json({ message: `Thought saved: ${filePath}` });
};

const saveThought = async (
	obsidianApp: App,
	saveFolder: string,
	thought: Thought,
	next: NextFunction
) => {
	const { createdAt, content, project, frontmatter } = thought;

	const fileName = `nuthought-${createdAt}.md`;
	const filePath = path.join(saveFolder, fileName);
	const data = getFrontmatter(createdAt, project, frontmatter) + "\n" + content;

	try {
		const folderExists = await obsidianApp.vault.adapter.exists(saveFolder);
		if (!folderExists) {
			await obsidianApp.vault.createFolder(saveFolder);
		}

		await obsidianApp.vault.create(filePath, data);
		return filePath;
	} catch (err: unknown) {
		const error = err as Error;
		console.error(`Error saving thought: ${error.message}`);
		next(`Error saving thought: ${error.message}`);
		return null;
	}
};

const getFrontmatter = (
	creationTime: number,
	project: string | null | undefined,
	frontmatter: FrontmatterItem[] | undefined
) => {
	const fm: Record<string, unknown> = {};
	fm.creation = getDateTime(creationTime);
	if (project) {
		fm.project = project;
	}
	for (const item of frontmatter ?? []) {
		fm[item.key] = convertValue(item);
	}
	return `---\n${stringifyYaml(fm)}---`;
};

const convertValue = (item: FrontmatterItem): unknown => {
	switch (item.type) {
		case "checkbox":
			return item.value === "true";
		case "list":
		case "tags":
			return item.value
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		case "text":
		default:
			return item.value;
	}
};

const isValidFrontmatter = (value: unknown): value is FrontmatterItem[] => {
	if (!Array.isArray(value)) {
		return false;
	}
	return value.every(
		(item) =>
			item !== null &&
			typeof item === "object" &&
			typeof item.key === "string" &&
			typeof item.value === "string" &&
			typeof item.type === "string"
	);
};

const getDateTime = (creationTime: number) => {
	const momentDate = moment(creationTime);
	return momentDate.format("YYYY-MM-DDTHH:mm:ss");
};
