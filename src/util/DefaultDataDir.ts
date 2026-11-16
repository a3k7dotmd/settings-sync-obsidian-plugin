import { homedir, tmpdir } from 'os';
import { basename, join } from 'path';

/**
 * The per-user data folder for an application, by the rules of @folder/xdg 4.0.1 (its index.js and
 * the "resolve" function of its lib/utils.js). The plugin used that library for this one value
 * until 0.7.4; the library also pulled a YAML, a TOML and an INI parser into main.js (445 KB of
 * 566 KB).
 *
 * The rules must not change: the result is the default profiles path of every vault that has no
 * profiles path of its own.
 *
 * - Windows: `%LOCALAPPDATA%\<Subdir>\Data`
 * - macOS: `~/Library/Application Support/<Subdir>`
 * - Linux: `~/.local/share/<subdir>`
 *
 * `XDG_DATA_HOME` replaces the base folder on every platform. Like the library, the sub folders
 * get a capital first letter when the last part of the base folder starts with a capital letter,
 * and are lower-cased otherwise.
 *
 * @param subdir Name of the sub folder of the application
 * @param platform The platform to answer for. Parameter exists for the unit test
 * @param env The environment variables to use. Parameter exists for the unit test
 * @param home The home directory of the user. Parameter exists for the unit test
 * @returns The path of the data folder
 * @throws {Error} If the platform is not Windows, macOS or Linux
 */
export function defaultDataDir(
	subdir: string,
	platform: string = process.platform,
	env: Record<string, string | undefined> = process.env,
	home: string = homedir() || (platform === 'win32' ? tmpdir() : '/usr/local/share'),
): string {
	const resolve = (parent: string, ...parts: string[]) => {
		const capitalize = /^[A-Z]/.test(basename(parent));
		return join(parent, ...parts.map(part => (capitalize ? part.charAt(0).toUpperCase() + part.slice(1) : part.toLowerCase())));
	};

	switch (platform) {
		case 'win32':
			return resolve(env.XDG_DATA_HOME || (env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')), subdir, 'Data');
		case 'darwin':
			return resolve(env.XDG_DATA_HOME || join(home, 'Library', 'Application Support'), subdir);
		case 'linux':
			return resolve(env.XDG_DATA_HOME || join(home, '.local', 'share'), subdir);
		default:
			throw new Error(`Platform "${platform}" is not supported`);
	}
}
