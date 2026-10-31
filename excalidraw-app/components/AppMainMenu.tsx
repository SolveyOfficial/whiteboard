import { MainMenu } from "@excalidraw/excalidraw/index";
import { ExternalLinkIcon } from "@excalidraw/excalidraw/components/icons";
import React from "react";

import type { Theme } from "@excalidraw/element/types";

import { LanguageList } from "../app-language/LanguageList";
import { LICENCES_URL, SOLVEY_URL, SOURCE_URL, TOOLS_URL } from "../links";

import { SolveyLogo } from "./SolveyLogo";

export const AppMainMenu: React.FC<{
  theme: Theme | "system";
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.DefaultItems.CommandPalette />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.ItemLink icon={SolveyLogo} href={SOLVEY_URL}>
        Made by Solvey
      </MainMenu.ItemLink>
      <MainMenu.ItemLink icon={ExternalLinkIcon} href={TOOLS_URL}>
        More free tools
      </MainMenu.ItemLink>
      <MainMenu.ItemLink icon={ExternalLinkIcon} href={SOURCE_URL}>
        Source code
      </MainMenu.ItemLink>
      <MainMenu.ItemLink icon={ExternalLinkIcon} href={LICENCES_URL}>
        Licences
      </MainMenu.ItemLink>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Preferences />
      <MainMenu.DefaultItems.ToggleTheme allowSystemTheme theme={props.theme} />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
