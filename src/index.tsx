import "./i18n"
import {
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  ToggleField,
  Navigation,
  DropdownItem,
} from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { Trans } from 'react-i18next'
import { t } from 'i18next';
import { WatermarkOverlay, State, WatermarkFile } from "./blackOverlay";
import { LogoIcon } from "./icons";
import { QUICK_ACCESS_MENU, START, WARNING } from "./ButtonIcons";
import { Input } from "./input";


const Content: VFC<{ serverAPI: ServerAPI, state: State }> = ({ serverAPI, state }) => {

  const [enableOverlay, setEnableOverlay] = useState<boolean>(false);
  const [watermarkFiles, setWatermarkFiles] = useState<WatermarkFile[]>([]);
  const [selectedWatermarkPath, setSelectedWatermarkPath] = useState<string | null>(null);

  useEffect(() => {
    setEnableOverlay(state.GetState());
    setSelectedWatermarkPath(state.GetSelectedWatermarkPath());
    state.onStateChanged(onStateChanged);
    state.onWatermarkChanged(onWatermarkChanged);
    
    // Load available watermark files from backend
    loadWatermarkFiles();
    
    return () => {
      state.offStateChanged(onStateChanged);
      state.offWatermarkChanged(onWatermarkChanged);
    };
  }, []);

  const loadWatermarkFiles = async () => {
    try {
      const result = await serverAPI.callPluginMethod<{}, WatermarkFile[]>("get_watermark_files", {});
      if (result.success && result.result) {
        setWatermarkFiles(result.result);
      }
    } catch (e) {
      console.error("Failed to load watermark files:", e);
    }
  };

  const onStateChanged = (b: boolean) => {
    setEnableOverlay(b);
  }

  const onWatermarkChanged = (_dataUrl: string | null) => {
    // Update local state based on what's in the State object
    setSelectedWatermarkPath(state.GetSelectedWatermarkPath());
  }

  const handleWatermarkSelect = async (path: string | null) => {
    try {
      await serverAPI.callPluginMethod("set_selected_watermark", { path });
      
      if (path) {
        // Load the image as base64 from backend
        const result = await serverAPI.callPluginMethod<{ path: string }, string | null>("get_watermark_base64", { path });
        if (result.success && result.result) {
          state.SetSelectedWatermark(path, result.result);
        } else {
          console.error("Failed to load watermark image, falling back to default");
          state.SetSelectedWatermark(null, null);
        }
      } else {
        state.SetSelectedWatermark(null, null);
      }
    } catch (e) {
      console.error("Failed to set watermark:", e);
    }
  };

  // Build dropdown options: "Default" plus any custom watermarks found
  const dropdownOptions = [
    { data: null, label: t("watermark_default") },
    ...watermarkFiles.map(wf => ({ data: wf.path, label: wf.name }))
  ];

  return (
    <div>
      <PanelSection>
        {!Input.isSupported() &&
          <PanelSectionRow>
            <div className={staticClasses.Label} style={{ paddingLeft: "0px", paddingRight: "0px" }}>
              <Trans
                i18nKey="error_hotkey_message"
                components={{ Key1: <WARNING style={{ height: "16px", width: "auto", marginBottom: "-3.5px", paddingRight: "0px" }} /> }}
              />
            </div>
          </PanelSectionRow>
        }
        
        <PanelSectionRow>
          <div className={staticClasses.Text} style={{ paddingLeft: "0px", paddingRight: "0px" }}>
            <Trans
              i18nKey="help_message"
              components={{ Key1: <QUICK_ACCESS_MENU style={{ height: "24px", width: "auto", marginBottom: "-6.5px" }} />, Key2: <START style={{ height: "24px", width: "auto", marginBottom: "-6.5px" }} /> }}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField checked={enableOverlay}
            label={t("toggle_enableoverlay_label")}
            description={<Trans i18nKey="toggle_enableoverlay_description" components={{ Key: <QUICK_ACCESS_MENU style={{ height: "18px", width: "auto", marginBottom: "-5px" }} /> }} />} onChange={(b) => { state.SetState(b); Navigation.CloseSideMenus(); }} />
        </PanelSectionRow>
        {watermarkFiles.length > 0 && (
          <PanelSectionRow>
            <DropdownItem
              label={t("watermark_select_label")}
              description={t("watermark_select_description")}
              menuLabel={t("watermark_select_menu_label")}
              rgOptions={dropdownOptions.map((opt, idx) => ({
                data: idx,
                label: opt.label
              }))}
              selectedOption={dropdownOptions.findIndex(opt => opt.data === selectedWatermarkPath)}
              onChange={(option) => {
                const selected = dropdownOptions[option.data as number];
                handleWatermarkSelect(selected?.data ?? null);
              }}
            />
          </PanelSectionRow>
        )}
      <PanelSectionRow>
          <div className={staticClasses.Label} style={{ paddingLeft: "0px", paddingRight: "0px" }}>
            <Trans
                i18nKey="warning_message"
                components={{ Key1: <WARNING style={{ height: "16px", width: "auto", marginBottom: "-3.5px", paddingRight: "0px" }} />}}
              />
          </div>
      </PanelSectionRow>
      </PanelSection>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  const state = new State();
  serverApi.routerHook.addGlobalComponent("WatermarkOverlay", () => (<WatermarkOverlay state={state} />));

  return {
    title: <div className={staticClasses.Title}>DeckWiz Watermark</div>,
    content: <Content serverAPI={serverApi} state={state} />,
    icon: <LogoIcon />,
    onDismount() {
      serverApi.routerHook.removeRoute("/decky-plugin-test");
      serverApi.routerHook.removeGlobalComponent("WatermarkOverlay");
    },
  };
});
