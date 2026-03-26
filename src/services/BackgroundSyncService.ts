import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import SyncService from './SyncService';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

/**
 * Background task that performs automatic backup if sync is enabled
 * and the last backup is older than the minimum interval.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('[BackgroundSync] Task started');

  try {
    // Check if sync is enabled
    const enabled = await SyncService.isEnabled();
    if (!enabled) {
      console.log('[BackgroundSync] Sync disabled, skipping backup');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check last backup time (minimum interval: 24 hours)
    const lastBackup = await SyncService.getLastBackupTime();
    const now = new Date();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (lastBackup) {
      const lastTime = new Date(lastBackup).getTime();
      if (now.getTime() - lastTime < ONE_DAY_MS) {
        console.log('[BackgroundSync] Last backup too recent, skipping');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }

    // Perform backup
    const result = await SyncService.backup();
    if (result.success) {
      console.log('[BackgroundSync] Backup completed successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.error('[BackgroundSync] Backup failed:', result.error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('[BackgroundSync] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registers the background sync task with the system.
 * Should be called once during app initialization.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    // Check if task is already registered (TaskManager.isTaskRegisteredAsync)
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 24 * 60 * 60 * 1000, // 24 hours
        stopOnTerminate: false, // continue when app is closed
        startOnBoot: true, // Android: start after device reboot
      });
      console.log('[BackgroundSync] Task registered');
    } else {
      console.log('[BackgroundSync] Task already registered');
    }
  } catch (error) {
    console.error('[BackgroundSync] Registration error:', error);
  }
}

/**
 * Unregisters the background sync task.
 * Useful for cleanup or if user disables cloud sync globally.
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSync] Task unregistered');
  } catch (error) {
    console.error('[BackgroundSync] Unregister error:', error);
  }
}

/**
 * Returns whether the background sync task is currently registered.
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch {
    return false;
  }
}
