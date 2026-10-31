// time constants (ms)
export const SAVE_TO_LOCAL_STORAGE_TIMEOUT = 300;
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000;
export const FILE_UPLOAD_TIMEOUT = 300;
export const LOAD_IMAGES_TIMEOUT = 500;
export const SYNC_BROWSER_TABS_TIMEOUT = 50;

// should be aligned with MAX_ALLOWED_FILE_BYTES
export const FILE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MiB
// 1 year (https://stackoverflow.com/a/25201898/927631)
export const FILE_CACHE_MAX_AGE_SEC = 31536000;

export const STORAGE_KEYS = {
  // the site shares its origin with other tools, so keys are prefixed
  LOCAL_STORAGE_ELEMENTS: "solvey-whiteboard",
  LOCAL_STORAGE_APP_STATE: "solvey-whiteboard-state",
  LOCAL_STORAGE_THEME: "solvey-whiteboard-theme",
  VERSION_DATA_STATE: "solvey-whiteboard-version-dataState",
  VERSION_FILES: "solvey-whiteboard-version-files",

  IDB_LIBRARY: "solvey-whiteboard-library",
} as const;
