import { NextFunction, Request, Response } from "express";
import { moment } from "obsidian";
import { validateFields } from "../validation";

import * as path from "path";

import { App } from "obsidian";
import { NuThoughtsSettings } from "../../types";
import { Thought } from "./types";

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
	const { createdAt, content } = req.body;

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

	const { saveFolder, shouldDebug } = settings;

	if (shouldDebug) {
		console.log("Received thought:", createdAt, content);
	}

	const filePath = await saveThought(
		obsidianApp,
		saveFolder,
		{
			createdAt,
			content,
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
	const { createdAt, content } = thought;

	const fileName = `nuthought-${createdAt}.md`;
	const filePath = path.join(saveFolder, fileName);
	const data = getFrontmatter(createdAt) + "\n" + content;

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

const getFrontmatter = (creationTime: number) => {
	const dateTime = getDateTime(creationTime);
	const lines: string[] = [];
	lines.push("---");
	lines.push(`creation: ${dateTime}`);
	lines.push("---");
	return lines.join("\n");
};

const getDateTime = (creationTime: number) => {
	const momentDate = moment(creationTime);
	return momentDate.format("YYYY-MM-DDTHH:mm:ss");
};
