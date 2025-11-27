import { findModuleChild } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { Button, Input } from "./input";
import watermarkPng from "./watermark.png";

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
    private onStateChangedListeners: Array<(b: boolean) => void> = [];

    onStateChanged(callback: (b: boolean) => void) {
        this.onStateChangedListeners.push(callback);
    }

    offStateChanged(callback: (b: boolean) => void) {
        const index = this.onStateChangedListeners.indexOf(callback);
        if (index !== -1) {
            this.onStateChangedListeners.splice(index, 1);
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
}

export const WatermarkBackground: VFC = () => {
    useUIComposition(UIComposition.Notification);
    return (
        <div style={{
            height: "100vh",
            width: "100vw",
            backgroundImage: `url(${watermarkPng})`,
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

    useEffect(() => {
        state.onStateChanged(onStateChanged);

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


    return (
        <>
            {visible &&
                <WatermarkBackground />
            }
        </>
    );
}
