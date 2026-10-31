import {
  Excalidraw,
  CaptureUpdateAction,
  ExcalidrawAPIProvider,
  useExcalidrawAPI,
} from "@excalidraw/excalidraw";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import { EVENT, debounce, isTestEnv, preventUnload } from "@excalidraw/common";
import polyfill from "@excalidraw/excalidraw/polyfill";
import { useCallback, useEffect, useRef } from "react";
import { t } from "@excalidraw/excalidraw/i18n";
import { isElementLink, newElementWith } from "@excalidraw/element";
import { isInitializedImageElement } from "@excalidraw/element";
import {
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";
import { useHandleLibrary } from "@excalidraw/excalidraw/data/library";
import { resolvablePromise } from "@excalidraw/common";

import type {
  FileId,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
  ExcalidrawProps,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ResolvablePromise } from "@excalidraw/common/utils";

import CustomStats from "./CustomStats";
import { Provider, useAtomValue, appJotaiStore } from "./app-jotai";
import { STORAGE_KEYS, SYNC_BROWSER_TABS_TIMEOUT } from "./app_constants";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import { TopErrorBoundary } from "./components/TopErrorBoundary";
import { SolveyLogo } from "./components/SolveyLogo";
import { updateStaleImageStatuses } from "./data/FileManager";
import { FileStatusStore } from "./data/fileStatusStore";
import { importFromLocalStorage } from "./data/localStorage";
import {
  LibraryIndexedDBAdapter,
  LocalData,
  localStorageQuotaExceededAtom,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import { SOLVEY_URL, SOURCE_URL, TOOLS_URL } from "./links";

import "./index.scss";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

// Subscribe early, as the event can fire before the app renders.
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    event.preventDefault();
    pwaEvent = event;
  },
);

const loadLocalScene = (): ExcalidrawInitialDataState => {
  const localDataState = importFromLocalStorage();
  return {
    elements: restoreElements(localDataState?.elements, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(localDataState?.appState, null),
  };
};

const getImageFileIds = (
  elements: readonly { type: string }[] | null | undefined,
  skip?: BinaryFiles,
) =>
  (elements || []).reduce((acc, element) => {
    if (
      isInitializedImageElement(element as NonDeletedExcalidrawElement) &&
      !skip?.[(element as any).fileId]
    ) {
      return acc.concat((element as any).fileId);
    }
    return acc;
  }, [] as FileId[]);

const openLink = (url: string) => {
  window.open(url, "_blank", "noopener noreferrer");
};

const WhiteboardWrapper = () => {
  const excalidrawAPI = useExcalidrawAPI();

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();
  const [langCode, setLangCode] = useAppLangCode();

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
  });

  const loadImagesFromStorage = useCallback(
    (fileIds: FileId[]) => {
      if (!excalidrawAPI || !fileIds.length) {
        return;
      }
      LocalData.fileStorage
        .getFiles(fileIds)
        .then(({ loadedFiles, erroredFiles }) => {
          if (loadedFiles.length) {
            excalidrawAPI.addFiles(loadedFiles);
          }
          updateStaleImageStatuses({
            excalidrawAPI,
            erroredFiles,
            elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
          });
        });
    },
    [excalidrawAPI],
  );

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const scene = loadLocalScene();
    const fileIds = getImageFileIds(scene.elements);
    loadImagesFromStorage(fileIds);
    // remove images left over from earlier sessions
    LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
    initialStatePromiseRef.current.promise.resolve(scene);

    // keep several open tabs in sync
    const syncData = debounce(() => {
      if (isTestEnv() || document.hidden) {
        return;
      }
      if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
        const localDataState = importFromLocalStorage();
        setLangCode(getPreferredLanguage());
        excalidrawAPI.updateScene({
          ...localDataState,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        LibraryIndexedDBAdapter.load().then((data) => {
          if (data) {
            excalidrawAPI.updateLibrary({ libraryItems: data.libraryItems });
          }
        });
      }
      if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
        loadImagesFromStorage(
          getImageFileIds(
            excalidrawAPI.getSceneElementsIncludingDeleted(),
            excalidrawAPI.getFiles(),
          ),
        );
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      LocalData.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        LocalData.flushSave();
      }
      if (
        event.type === EVENT.VISIBILITY_CHANGE ||
        event.type === EVENT.FOCUS
      ) {
        syncData();
      }
    };

    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(
        EVENT.VISIBILITY_CHANGE,
        visibilityChange,
        false,
      );
    };
  }, [excalidrawAPI, setLangCode, loadImagesFromStorage]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        excalidrawAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          excalidrawAPI.getSceneElements(),
        ) &&
        import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true"
      ) {
        preventUnload(event);
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [excalidrawAPI]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (LocalData.isSavePaused()) {
      return;
    }
    LocalData.save(elements, appState, files, () => {
      if (!excalidrawAPI) {
        return;
      }
      let didChange = false;
      const nextElements = excalidrawAPI
        .getSceneElementsIncludingDeleted()
        .map((element) => {
          if (LocalData.fileStorage.shouldUpdateImageElementStatus(element)) {
            const newElement = newElementWith(element, { status: "saved" });
            if (newElement !== element) {
              didChange = true;
            }
            return newElement;
          }
          return element;
        });

      if (didChange) {
        excalidrawAPI.updateScene({
          elements: nextElements,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    });
  };

  const renderCustomStats = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: UIAppState,
  ) => (
    <CustomStats
      setToast={(message) => excalidrawAPI!.setToast({ message })}
      appState={appState}
      elements={elements}
    />
  );

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  // Wait for images that are still loading before a file is saved.
  const onExport: Required<ExcalidrawProps>["onExport"] = useCallback(
    async function* () {
      let snapshot = FileStatusStore.getSnapshot();
      const { pending, total } = FileStatusStore.getPendingCount(
        snapshot.value,
      );
      if (pending === 0) {
        return;
      }

      yield {
        type: "progress",
        progress: (total - pending) / total,
        message: `Loading images (${total - pending}/${total})...`,
      };

      while (true) {
        snapshot = await FileStatusStore.pull(snapshot.version);
        const { pending: nowPending, total: nowTotal } =
          FileStatusStore.getPendingCount(snapshot.value);

        yield {
          type: "progress",
          progress: (nowTotal - nowPending) / nowTotal,
          message: `Loading images (${nowTotal - nowPending}/${nowTotal})...`,
        };

        if (nowPending === 0) {
          return;
        }
      }
    },
    [],
  );

  return (
    <div style={{ height: "100%" }} className="excalidraw-app">
      <Excalidraw
        onChange={onChange}
        onExport={onExport}
        initialData={initialStatePromiseRef.current.promise}
        aiEnabled={false}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {},
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        onThemeChange={setAppTheme}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.setViewport({
              target: element.link,
              fit: "scale-down",
              animation: true,
            });
          }
        }}
      >
        <AppMainMenu theme={appTheme} />
        <AppWelcomeScreen />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
        </OverwriteConfirmDialog>
        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">
            {t("alerts.localStorageQuotaExceeded")}
          </div>
        )}
        <CommandPalette
          customCommandPaletteItems={[
            {
              label: "Solvey",
              icon: SolveyLogo,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["solvey", "website", "contact"],
              perform: () => openLink(SOLVEY_URL),
            },
            {
              label: "More tools",
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["tools", "apps", "solvey"],
              perform: () => openLink(TOOLS_URL),
            },
            {
              label: "Source code",
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["github", "code", "source"],
              perform: () => openLink(SOURCE_URL),
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // the event can't be reused
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
      </Excalidraw>
    </div>
  );
};

const WhiteboardApp = () => {
  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <ExcalidrawAPIProvider>
          <WhiteboardWrapper />
        </ExcalidrawAPIProvider>
      </Provider>
    </TopErrorBoundary>
  );
};

export default WhiteboardApp;
