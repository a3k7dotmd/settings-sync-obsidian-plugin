import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { filesEqualSync } from '../src/util/FileSystem';
import { filterChangedFiles } from '../src/util/SettingsFiles';

// FileSystem.ts imports a class from 'obsidian', which exists only inside the app
jest.mock('obsidian', () => ({ FileSystemAdapter: class { } }), { virtual: true });

/*
 * Until 0.7.5 a file whose content changed while its size stayed the same (a manifest going from
 * 1.2.5 to 1.2.6) was treated as unchanged and never synced.
 */
describe('change detection for files of unchanged size', () => {
	let dir: string;
	let vault: string;
	let profile: string;

	const write = (base: string, name: string, content: string, time: number) => {
		const file = join(base, name);
		writeFileSync(file, content);
		utimesSync(file, time, time);
		return file;
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'settings-sync-test-'));
		vault = join(dir, 'vault');
		profile = join(dir, 'profile');
		mkdirSync(vault);
		mkdirSync(profile);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	test('filesEqualSync compares the content when the size is the same', () => {
		const a = write(vault, 'manifest.json', '{"version": "1.2.6"}', 2000);
		const b = write(profile, 'manifest.json', '{"version": "1.2.5"}', 1000);
		expect(filesEqualSync(a, b)).toBe(false);

		const c = write(vault, 'same.json', '{"version": "1.2.5"}', 2000);
		const d = write(profile, 'same.json', '{"version": "1.2.5"}', 1000);
		expect(filesEqualSync(c, d)).toBe(true);
	});

	test('filesEqualSync reports files of different size as different', () => {
		const a = write(vault, 'manifest.json', '{"version": "1.2.10"}', 1000);
		const b = write(profile, 'manifest.json', '{"version": "1.2.5"}', 1000);
		expect(filesEqualSync(a, b)).toBe(false);
	});

	test('filterChangedFiles reports a changed file of unchanged size', () => {
		write(vault, 'identical.json', '{"version": "1.2.5"}', 1000);
		write(profile, 'identical.json', '{"version": "1.2.5"}', 1000);
		write(vault, 'same-size-changed.json', '{"version": "1.2.6"}', 2000);
		write(profile, 'same-size-changed.json', '{"version": "1.2.5"}', 1000);
		write(vault, 'size-changed.json', '{"version": "1.2.10"}', 2000);
		write(profile, 'size-changed.json', '{"version": "1.2.5"}', 1000);
		write(vault, 'new.json', '{}', 2000);

		const files = ['identical.json', 'same-size-changed.json', 'size-changed.json', 'new.json'];
		expect(filterChangedFiles(files, [vault], [profile])).toEqual(['same-size-changed.json', 'size-changed.json', 'new.json']);
	});
});
