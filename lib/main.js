const { BrowserWindow, app, Menu, ipcMain, protocol } = require("electron");
const { resolve, join } = require("path");
const { readFileSync } = require("fs");

function loadConfig(path) {
  return readFileSync(path, { encoding: "utf-8" });
}

const config = JSON.parse(
  loadConfig(resolve((app.getAppPath(), "..", "config.json")))
);

// main window
let win;

// sandbox
app.enableSandbox();
app.allowRendererProcessReuse = true;

if (!!config.switch && Array.isArray(config.switch)) {
  for (const s of config.switch) {
    const sp = s.split(":");
    if (sp.length === 2) {
      app.commandLine.appendSwitch(sp[0], sp[1]);
    } else {
      app.commandLine.appendSwitch(s);
    }
  }
}

if (!!config.single_instance) {
  app.requestSingleInstanceLock();
}

if (!config.debug) {
  Menu.setApplicationMenu(null);
}

if (!config.hardware_acceleration) {
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  protocol.registerFileProtocol("shinycolors", (request) => {
    let url = request.url.substr("shinycolors://".length);
    if (url.startsWith("sc-host-prefix?")) {
      url = url.substr("sc-host-prefix?".length);
      win.loadURL(url);
    }
  });

  win = new BrowserWindow({
    width: 1280 - 4,
    height: 720,
    autoHideMenuBar: true,
    resizable: false,
    icon: join(app.getAppPath(), "build", "icon.png"),
    webPreferences: {
      preload: join(app.getAppPath(), "lib", "preload.js"),
    },
  });

  let userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";
  if (
    !!config.native &&
    typeof config.native === "object" &&
    !!config.native.enable
  ) {
    userAgent +=
      " ENZA_NATIVE_com.bandainamcoent.shinycolors_Android 1.0.26/(126)";
  }
  win.webContents.userAgent = userAgent;

  win.loadURL("https://shinycolors.enza.fun");

  win.on("closed", () => {
    win = null;
  });

  ipcMain.on("get-config", (event) => {
    event.returnValue = config;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (win == null) {
    createWindow();
  }
});
