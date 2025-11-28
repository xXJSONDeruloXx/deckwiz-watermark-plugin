# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code one directory up
# or add the `decky-loader/plugin` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky_plugin
import os
import glob
import base64

class Plugin:
    WATERMARK_DIR = os.path.expanduser("~/Documents/wm")
    selected_watermark: str | None = None

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        pass

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        pass

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass

    async def get_watermark_files(self) -> list[dict]:
        """
        Get list of PNG files from ~/Documents/wm directory.
        Returns a list of dicts with 'name' (filename) and 'path' (full path).
        """
        files = []
        if os.path.exists(self.WATERMARK_DIR):
            png_files = glob.glob(os.path.join(self.WATERMARK_DIR, "*.png"))
            for f in png_files:
                files.append({
                    "name": os.path.basename(f),
                    "path": f
                })
        return files

    async def get_selected_watermark(self) -> str | None:
        """
        Get the currently selected watermark path.
        Returns None if no custom watermark is selected (use bundled).
        """
        return self.selected_watermark

    async def set_selected_watermark(self, path: str | None) -> bool:
        """
        Set the selected watermark path.
        Pass None to use the bundled watermark.
        """
        self.selected_watermark = path
        decky_plugin.logger.info(f"Selected watermark set to: {path}")
        return True

    async def get_watermark_base64(self, path: str) -> str | None:
        """
        Read a watermark image file and return it as a base64 data URL.
        Returns None if the file doesn't exist or can't be read.
        """
        try:
            if not path or not os.path.exists(path):
                decky_plugin.logger.error(f"Watermark file not found: {path}")
                return None
            
            # Security check: only allow files from the watermark directory
            real_path = os.path.realpath(path)
            real_wm_dir = os.path.realpath(self.WATERMARK_DIR)
            if not real_path.startswith(real_wm_dir):
                decky_plugin.logger.error(f"Security: Attempted to access file outside watermark dir: {path}")
                return None
            
            with open(path, 'rb') as f:
                image_data = f.read()
            
            base64_data = base64.b64encode(image_data).decode('utf-8')
            data_url = f"data:image/png;base64,{base64_data}"
            decky_plugin.logger.info(f"Successfully loaded watermark: {path} ({len(image_data)} bytes)")
            return data_url
        except Exception as e:
            decky_plugin.logger.error(f"Failed to read watermark file {path}: {e}")
            return None