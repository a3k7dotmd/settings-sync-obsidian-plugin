import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Marker file written next to the profile (e.g. <profilesPath>/<profile>/.sync-state.json).
 * It is NOT part of the synced config set, so it never gets copied into a vault. It records a
 * monotonically increasing revision that is bumped on every upload that changed the profile.
 *
 * This is the change signal the download side polls: an instance compares the profile's `rev`
 * to the `rev` it last synced. Using an app-written revision (not filesystem mtime) keeps it
 * reliable across machines and network shares - immune to clock skew, timestamp resolution and
 * attribute caching.
 */
export const SYNC_MARKER_FILE = '.sync-state.json';

export interface SyncMarker {

	/** Monotonically increasing revision, bumped on every upload that changed the profile. */
	rev: number;

	/** Machine id of the device that wrote this revision (lets a vault ignore its own save). */
	savedBy: string;

	/** ISO timestamp of the save. Informational only - never used for comparison. */
	savedAt: string;
}

/**
 * Reads the sync marker for a profile.
 * @param profileDir Path parts to the profile directory
 * @returns The marker, or `undefined` if missing/invalid
 */
export function readSyncMarker(profileDir: string[]): SyncMarker | undefined {
	try {
		const file = join(...profileDir, SYNC_MARKER_FILE);
		if (!existsSync(file) || !statSync(file).isFile()) {
			return undefined;
		}
		const data = JSON.parse(readFileSync(file, 'utf-8')) as Partial<SyncMarker>;
		if (typeof data.rev !== 'number') {
			return undefined;
		}
		return { rev: data.rev, savedBy: data.savedBy ?? '', savedAt: data.savedAt ?? '' };
	}
	catch (e) {
		console.warn('[Settings Profiles] Failed to read sync marker!', e);
		return undefined;
	}
}

/**
 * Asynchronously reads the sync marker. Used on the polling path so the network round-trip does
 * not block the timer handler (which triggers "setInterval handler took Nms" violations on a share).
 * A single readFile is used (no exists/stat round-trips); a missing file resolves to `undefined`.
 * @param profileDir Path parts to the profile directory
 * @returns The marker, or `undefined` if missing/invalid
 */
export async function readSyncMarkerAsync(profileDir: string[]): Promise<SyncMarker | undefined> {
	const file = join(...profileDir, SYNC_MARKER_FILE);
	try {
		const data = JSON.parse(await readFile(file, 'utf-8')) as Partial<SyncMarker>;
		if (typeof data.rev !== 'number') {
			return undefined;
		}
		return { rev: data.rev, savedBy: data.savedBy ?? '', savedAt: data.savedAt ?? '' };
	}
	catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
			console.warn('[Settings Profiles] Failed to read sync marker (async)!', e);
		}
		return undefined;
	}
}

/**
 * Writes the sync marker for a profile.
 * @param profileDir Path parts to the profile directory
 * @param marker The marker to write
 */
export function writeSyncMarker(profileDir: string[], marker: SyncMarker): void {
	const file = join(...profileDir, SYNC_MARKER_FILE);
	writeFileSync(file, JSON.stringify(marker, null, 2), 'utf-8');
}
