import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, normalize, sep as slash } from 'path';
import { PROFILE_OPTIONS_MAP, ProfileOptions } from 'src/settings/SettingsInterface';
import { ensurePathExist, filesEqualSync, getAllFiles, isValidPath } from './FileSystem';

/**
 * Saves the profile options data to the path.
 * @param profile The profile to save
 * @param profilesPath The path where the profile should be saved
 */
export async function saveProfileOptions(profile: ProfileOptions, profilesPath: string) {
	try {
		// Ensure is valid profile
		if (!profile) {
			throw Error(`Can't save undefined profile! Profile: ${JSON.stringify(profile)}`);
		}

		// Ensure is valid path
		if (!isValidPath([profilesPath, profile.name])) {
			throw Error(`Invalid path received! ProfilesPath: ${profilesPath}`);
		}

		// Ensure path exist
		ensurePathExist([profilesPath, profile.name]);

		// Write profile settings to path
		const file = join(profilesPath, profile.name, 'profile.json');
		const profileSettings = JSON.stringify(profile, null, 2);
		writeFileSync(file, profileSettings, 'utf-8');
	}
	catch (e) {
		(e as Error).message = 'Failed to save profile data! ' + (e as Error).message;
		throw e;
	}
}

/**
 * Saves the profiles options data to the path.
 * @param profilesList The profiles to save
 * @param profilesPath The path where the profiles should be saved
 */
export async function saveProfilesOptions(profilesList: ProfileOptions[], profilesPath: string) {
	try {
		profilesList.forEach(profile => {
			// Ensure is valid profile
			if (!profile) {
				throw Error(`Can't save undefined profile! Profile: ${JSON.stringify(profile)}`);
			}

			// Ensure is valid path
			if (!isValidPath([profilesPath, profile.name])) {
				throw Error(`Invalid path received! ProfilesPath: ${profilesPath}`);
			}

			// Ensure path exist
			ensurePathExist([profilesPath, profile.name]);

			// Write profile settings to path
			const file = join(profilesPath, profile.name, 'profile.json');
			const profileSettings = JSON.stringify(profile, null, 2);
			writeFileSync(file, profileSettings, 'utf-8');
		});
	}
	catch (e) {
		(e as Error).message = 'Failed to save profiles data! ' + (e as Error).message + ` ProfilesList: ${JSON.stringify(profilesList)}`;
		throw e;
	}
}

/**
 * Loads the profile options data form the path
 * @param profile The profile to load name is requierd
 * @param profilesPath The path where the profiles are saved
 * @param
 */
export function loadProfileOptions(profile: Partial<ProfileOptions>, profilesPath: string): ProfileOptions {
	try {
		if (!profile.name) {
			throw Error(`Name is requierd! Profile: ${JSON.stringify(profile)}`);
		}

		// Search for all profiles existing
		const file = join(profilesPath, profile.name, 'profile.json');
		let profileData: ProfileOptions | undefined = undefined;

		if (!existsSync(file)) {
			throw Error(`Path does not exist! Path: ${file}`);
		}

		if (!statSync(file).isFile()) {
			throw Error(`The path does not point to a file. Path: ${file}`);
		}

		// Read profile settings
		const data = readFileSync(file, 'utf-8');
		profileData = JSON.parse(data);

		if (!profileData) {
			throw Error('Failed to read profile from file!');
		}

		// Convert date string to date
		profileData.modifiedAt = new Date(profileData.modifiedAt);

		return profileData;
	}
	catch (e) {
		(e as Error).message = 'Failed to load profile data! ' + (e as Error).message;
		throw e;
	}
}

/**
 * Loads the profiles options data form the path
 * @param profilesPath The path where the profiles are saved
 */
export function loadProfilesOptions(profilesPath: string): ProfileOptions[] {
	try {
		// Search for all profiles existing
		const files = getAllFiles([profilesPath, `${slash}*${slash}profile.json`]);
		const profilesList: ProfileOptions[] = [];

		// Read profile settings
		files.forEach(file => {
			if (!existsSync(file)) {
				throw Error(`Path does not exist! Path: ${file}`);
			}

			if (!statSync(file).isFile()) {
				throw Error(`The path does not point to a file. Path: ${file}`);
			}
			const data = readFileSync(file, 'utf-8');
			const profileData = JSON.parse(data);

			if (!profileData) {
				throw Error('Failed to read profile from file!');
			}

			// Convert date string to date
			profileData.modifiedAt = new Date(profileData.modifiedAt);

			profilesList.push(profileData);
		});
		return profilesList;
	}
	catch (e) {
		(e as Error).message = 'Failed to load profiles data! ' + (e as Error).message;
		throw e;
	}
}

/**
 * Returns all setting files if they are enabeled in profile
 * @param profile The profile for which the files will be returned
 * @returns an array of file names
 * @todo return {add: string[], remove: string[]}
 */
export function getConfigFilesList(profile: ProfileOptions): string[] {
	const files = [];
	for (const key in profile) {
		if (Object.prototype.hasOwnProperty.call(profile, key)) {
			const value = profile[key as keyof ProfileOptions];
			if (typeof value === 'boolean' && key !== 'enabled' && value) {
				const file = PROFILE_OPTIONS_MAP[key as keyof ProfileOptions]?.file;
				if (file && typeof file === 'string') {
					files.push(normalize(file));
				}
				else if (file && Array.isArray(file)) {
					file.forEach(f => {
						files.push(normalize(f));
					});
				}
			}
		}
	}

	return files;
}

/**
 * Returns all files without placeholder
 * @param filesList filesList Files list with placeholders
 * @param path Path to fill placeholders
 * @returns The files list without placeholder
 */
export function getFilesWithoutPlaceholder(filesList: string[], path: string[]): string[] {
	const files: string[] = [];
	filesList.forEach(file => {
		if ((file.includes(`${slash}*${slash}`) || file.includes(`${slash}*`))) {
			const pathVariants = getAllFiles([...path, file])

				// Trim the start of path
				.map(value => value.split(slash).slice(-file.split(slash).length));

			pathVariants.forEach(value => {
				files.push(join(...value));
			});
		}
		else {
			files.push(file);
		}
	});

	return files;
}

/**
 * Returns the managed files that exist in the target but no longer exist in the source.
 * These are deletions (e.g. an uninstalled plugin, a removed snippet/theme) that need to be
 * propagated so the target becomes a mirror of the source instead of only ever growing.
 *
 * Both sides are expanded from the same patterns, so fixed (non placeholder) files like
 * `app.json` are always present in both lists and are never reported as removed.
 * @param patterns The config file patterns (may contain placeholders) for the enabled options
 * @param sourcePath The source base path
 * @param targetPath The target base path
 * @param profile The profile (used to respect the ignore list)
 * @returns The relative file paths that exist in target but not in source
 */
export function getRemovedFiles(patterns: string[], sourcePath: string[], targetPath: string[], profile: ProfileOptions): string[] {
	let sourceFiles = getFilesWithoutPlaceholder(patterns, sourcePath);
	sourceFiles = filterIgnoreFilesList(sourceFiles, profile);

	let targetFiles = getFilesWithoutPlaceholder(patterns, targetPath);
	targetFiles = filterIgnoreFilesList(targetFiles, profile);

	const sourceSet = new Set(sourceFiles);
	return targetFiles.filter(file => !sourceSet.has(file));
}

/**
 * Returns all ignore files if they are enabeled in profile
 * @param profile The profile for which the files will be returned
 * @returns an array of file names
 * @todo return {add: string[], remove: string[]}
 */
export function getIgnoreFilesList(profile: ProfileOptions): string[] {
	const files = [];
	for (const key in profile) {
		if (Object.prototype.hasOwnProperty.call(profile, key)) {
			const value = profile[key as keyof ProfileOptions];
			if (value && typeof value === 'boolean') {
				const file = PROFILE_OPTIONS_MAP[key as keyof ProfileOptions]?.ignore;
				if (file && typeof file === 'string') {
					files.push(normalize(file));
				}
				else if (file && Array.isArray(file)) {
					file.forEach(f => {
						files.push(normalize(f));
					});
				}
			}
		}
	}

	return files;
}

/**
 * Filter the file list to only include not ignore files
 * @param filesList Files list to compare
 * @param profile The profile for which the ignore files
 * @returns The filtered files list
 */
export function filterIgnoreFilesList(filesList: string[], profile: ProfileOptions): string[] {
	const ignoreFiles = getIgnoreFilesList(profile);
	return filesList.filter((file) => !ignoreFiles.contains((file)));
}

/**
 * Filter the file list to only include unchanged files
 * @param filesList Files list to compare
 * @param sourcePath The path to the source file
 * @param targetPath The path to the target file
 * @returns The filtered files list
 */
export function filterUnchangedFiles(filesList: string[], sourcePath: string[], targetPath: string[]): string[] {
	return filesList.filter((file) => {
		const sourceFile = join(...sourcePath, file);

		// Check source exist and is file
		if (!existsSync(sourceFile)) {
			return false;
		}
		const sourceStat = statSync(sourceFile);
		if (!sourceStat.isFile()) {
			return false;
		}
		const targetFile = join(...targetPath, file);

		// Check target don't exist
		if (!existsSync(targetFile)) {
			return false;
		}
		const targetStat = statSync(targetFile);

		// Check target is file
		if (!targetStat.isFile()) {
			return false;
		}

		// Check file size
		if (sourceStat.size !== targetStat.size) {
			return false;
		}

		return filesEqualSync(sourceFile, targetFile);
	});
}

/**
 * Filter the file list to only include changed files
 * @param filesList Files list to compare
 * @param sourcePath The path to the source file
 * @param targetPath The path to the target file
 * @returns The filtered files list
 */
export function filterChangedFiles(filesList: string[], sourcePath: string[], targetPath: string[]): string[] {
	return filesList.filter((file) => {
		const sourceFile = join(...sourcePath, file);

		// Check source exist and is file
		if (!existsSync(sourceFile)) {
			return false;
		}
		const sourceStat = statSync(sourceFile);

		// Check source is file
		if (!sourceStat.isFile()) {
			return false;
		}
		const targetFile = join(...targetPath, file);

		// Check target don't exist
		if (!existsSync(targetFile)) {
			return true;
		}
		const targetStat = statSync(targetFile);

		// Check target is file
		if (!targetStat.isFile()) {
			return true;
		}

		// Check file size
		if (sourceStat.size !== targetStat.size) {
			return true;
		}

		/*
		 * Same size: compare content. `filesEqualSync` is synchronous, the previous
		 * `!filesEqual(...)` returned `!Promise` (always false), so same-size content
		 * changes were silently never copied.
		 */
		return !filesEqualSync(sourceFile, targetFile);
	});
}

/**
 * Filter the file list to only include the files there are newer in source than in target
 * @param filesList Files list to compare
 * @param sourcePath The path to the source file
 * @param targetPath The path to the target file
 * @returns The filterd files list
 */
export function filterNewerFiles(filesList: string[], sourcePath: string[], targetPath: string[]): string[] {
	return filesList.filter((file) => {
		const sourceFile = join(...sourcePath, file);

		// Check source exist and is file
		if (!existsSync(sourceFile)) {
			return false;
		}
		const sourceStat = statSync(sourceFile);
		if (!sourceStat.isFile()) {
			return false;
		}
		const targetFile = join(...targetPath, file);

		// Check target don't exist
		if (!existsSync(targetFile)) {
			return true;
		}

		const targetStat = statSync(targetFile);
		return sourceStat.mtime.getTime() > targetStat.mtime.getTime();
	});
}

/**
 * Check the files list contains a file that changed in source relative to target.
 *
 * This is the change-detection used by the auto-sync gate and the status bar, so it runs
 * frequently (on the UI interval). It is intentionally stat-only (size + modification time)
 * to stay cheap, especially when the profile store lives on an external/network drive -
 * it never reads file contents.
 *
 * NOTE: the previous implementation was `!filesList.every(async ...)`. An `async` callback
 * always returns a (truthy) Promise, so `every` was always `true` and this function always
 * returned `false`. That made `areSettingsSaved()` always report "saved" and was the reason
 * auto-sync never triggered a save.
 * @param filesList Files list to compare
 * @param sourcePath The path to the source file
 * @param targetPath The path to the target file
 * @returns Is there a file that is newer/changed in source than in target
 */
export function containsChangedFiles(filesList: string[], sourcePath: string[], targetPath: string[]): boolean {
	return filesList.some((file) => {
		const sourceFile = join(...sourcePath, file);

		// Source missing or not a file: nothing to sync from here
		if (!existsSync(sourceFile)) {
			return false;
		}
		const sourceStat = statSync(sourceFile);
		if (!sourceStat.isFile()) {
			return false;
		}
		const targetFile = join(...targetPath, file);

		// Present in source but missing in target: changed
		if (!existsSync(targetFile)) {
			return true;
		}
		const targetStat = statSync(targetFile);
		if (!targetStat.isFile()) {
			return true;
		}

		// Different size: changed
		if (sourceStat.size !== targetStat.size) {
			return true;
		}

		// Same size: changed only if source was modified after the saved target copy
		return sourceStat.mtimeMs > targetStat.mtimeMs;
	});
}