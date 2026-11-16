import { join } from 'path';
import { defaultDataDir } from '../src/util/DefaultDataDir';

/*
 * defaultDataDir() replaced the library @folder/xdg in 0.7.5. Its result is the default profiles
 * path, so these expectations pin the paths the library returned (compared against the library
 * itself with perf/default-path-equivalence.js before it was removed).
 */
describe('defaultDataDir', () => {
	const subdir = 'ObsidianPlugins';

	test('Windows uses LOCALAPPDATA or the home directory', () => {
		const home = join('C:', 'Users', 'Someone');
		expect(defaultDataDir(subdir, 'win32', {}, home)).toBe(join(home, 'AppData', 'Local', 'ObsidianPlugins', 'Data'));

		const local = join('C:', 'Users', 'Someone', 'AppData', 'Local');
		expect(defaultDataDir(subdir, 'win32', { LOCALAPPDATA: local }, home)).toBe(join(local, 'ObsidianPlugins', 'Data'));
	});

	test('macOS uses Application Support', () => {
		const home = join('/Users', 'someone');
		expect(defaultDataDir(subdir, 'darwin', {}, home)).toBe(join(home, 'Library', 'Application Support', 'ObsidianPlugins'));
	});

	test('Linux uses .local/share and lower-cases the sub folder', () => {
		const home = join('/home', 'someone');
		expect(defaultDataDir(subdir, 'linux', {}, home)).toBe(join(home, '.local', 'share', 'obsidianplugins'));
	});

	test('XDG_DATA_HOME replaces the base folder on every platform', () => {
		const custom = join('/custom', 'data');
		expect(defaultDataDir(subdir, 'win32', { XDG_DATA_HOME: custom }, 'unused')).toBe(join(custom, 'obsidianplugins', 'data'));
		expect(defaultDataDir(subdir, 'darwin', { XDG_DATA_HOME: custom }, 'unused')).toBe(join(custom, 'obsidianplugins'));
		expect(defaultDataDir(subdir, 'linux', { XDG_DATA_HOME: custom }, 'unused')).toBe(join(custom, 'obsidianplugins'));
	});

	test('the sub folders are capitalized only below a base folder that starts with a capital letter', () => {
		expect(defaultDataDir(subdir, 'linux', { XDG_DATA_HOME: join('/custom', 'Data') }, 'unused')).toBe(join('/custom', 'Data', 'ObsidianPlugins'));
		expect(defaultDataDir(subdir, 'win32', { LOCALAPPDATA: join('D:', 'profiles', 'local') }, 'unused')).toBe(join('D:', 'profiles', 'local', 'obsidianplugins', 'data'));
	});

	test('an unsupported platform is refused', () => {
		expect(() => defaultDataDir(subdir, 'aix', {}, 'unused')).toThrow('Platform "aix" is not supported');
	});
});
