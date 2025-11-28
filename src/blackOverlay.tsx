import { findModuleChild } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { Button, Input } from "./input";
import watermarkPng from "./watermark.png";

export interface WatermarkFile {
    name: string;
    path: string;
}

enum UIComposition {
    Hidden = 0,
    Notification = 1,
    Overlay = 2,
    Opaque = 3,
    OverlayKeyboard = 4,
}

const useUIComposition: (composition: UIComposition) => void = findModuleChild(
    (m) => {
        if (typeof m !== "object") return undefined;
        for (let prop in m) {
            if (
                typeof m[prop] === "function" &&
                m[prop].toString().includes("AddMinimumCompositionStateRequest") &&
                m[prop].toString().includes("ChangeMinimumCompositionStateRequest") &&
                m[prop].toString().includes("RemoveMinimumCompositionStateRequest") &&
                !m[prop].toString().includes("m_mapCompositionStateRequests")
            ) {
                return m[prop];
            }
        }
    }
);

export class State {
    private state = false;
    private selectedWatermarkPath: string | null = null;
    private selectedWatermarkDataUrl: string | null = null;
    private onStateChangedListeners: Array<(b: boolean) => void> = [];
    private onWatermarkChangedListeners: Array<(dataUrl: string | null) => void> = [];

    onStateChanged(callback: (b: boolean) => void) {
        this.onStateChangedListeners.push(callback);
    }

    offStateChanged(callback: (b: boolean) => void) {
        const index = this.onStateChangedListeners.indexOf(callback);
        if (index !== -1) {
            this.onStateChangedListeners.splice(index, 1);
        }
    }

    onWatermarkChanged(callback: (dataUrl: string | null) => void) {
        this.onWatermarkChangedListeners.push(callback);
    }

    offWatermarkChanged(callback: (dataUrl: string | null) => void) {
        const index = this.onWatermarkChangedListeners.indexOf(callback);
        if (index !== -1) {
            this.onWatermarkChangedListeners.splice(index, 1);
        }
    }

    SetState(b: boolean) {
        if (this.state === b)
            return;

        this.state = b;
        this.onStateChangedListeners.forEach(callback => {
            callback(b);
        });
    }

    GetState(): boolean {
        return this.state;
    }

    SetSelectedWatermark(path: string | null, dataUrl: string | null) {
        this.selectedWatermarkPath = path;
        this.selectedWatermarkDataUrl = dataUrl;
        this.onWatermarkChangedListeners.forEach(callback => {
            callback(dataUrl);
        });
    }

    GetSelectedWatermarkPath(): string | null {
        return this.selectedWatermarkPath;
    }

    GetSelectedWatermarkDataUrl(): string | null {
        return this.selectedWatermarkDataUrl;
    }
}

export const WatermarkBackground: VFC<{ imageDataUrl: string | null }> = ({ imageDataUrl }) => {
    useUIComposition(UIComposition.Notification);
    // Use custom watermark data URL if provided, otherwise fallback to bundled
    const backgroundUrl = imageDataUrl || watermarkPng;
    return (
        <div style={{
            height: "100vh",
            width: "100vw",
            backgroundImage: `url(${backgroundUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "bottom-right",
            backgroundSize: "auto",
            opacity: 1,
            zIndex: 7002,
            position: "fixed",
            pointerEvents: "none"
        }} />
    )
}

export const WatermarkOverlay: VFC<{ state: State }> = ({ state }) => {
    const [visible, setVisible] = useState(false);
    const [watermarkDataUrl, setWatermarkDataUrl] = useState<string | null>(state.GetSelectedWatermarkDataUrl());

    useEffect(() => {
        state.onStateChanged(onStateChanged);
        state.onWatermarkChanged(onWatermarkChanged);

        let suspend_register: { unregister: () => void } | null = null;
        if (SteamClient?.User?.RegisterForPrepareForSystemSuspendProgress != null){
            suspend_register = SteamClient.User.RegisterForPrepareForSystemSuspendProgress(((data: any[]) => {
                state.SetState(false);
            }));

        }

        const input = new Input([Button.QUICK_ACCESS_MENU, Button.START]);
        input.onShortcutPressed(onShortcutPressed);
        return () => {
            state.offStateChanged(onStateChanged);
            state.offWatermarkChanged(onWatermarkChanged);
            suspend_register?.unregister();
            input.offShortcutPressed(onShortcutPressed);
            input.unregister();
        };
    }, []);

    const onShortcutPressed = () => {
        state.SetState(!state.GetState());
    }

    const onStateChanged = (b: boolean) => {
        setVisible(b);
    }

    const onWatermarkChanged = (dataUrl: string | null) => {
        setWatermarkDataUrl(dataUrl);
    }


    return (
        <>
            {visible &&
                <WatermarkBackground imageDataUrl={watermarkDataUrl} />
            }
        </>
    );
}
