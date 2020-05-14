///////////////////////// Require //////////////////////////

const { remote, ipcRenderer } = require("electron");
const { extname, resolve } = remote.require("path");
const { promises } = remote.require("fs");
const { readFile, writeFile, stat } = promises;

////////////////////////////////////////////////////////////

function disable_console_overwrite() {
  window.console = new Proxy(window.console, {
    get: function (target, key) {
      if (typeof target[key] === "function") {
        return target[key].bind(target);
      }
      return target[key];
    },
    set() {
      return true;
    },
  });
}

function enable_zh_CN() {
  window.eval = new Proxy(window.eval, {
    apply(target, _this, [code]) {
      if (code.includes("var n=window.primJsp;")) {
        code = code.replace(
          "var n=window.primJsp;",
          "var n=window.primJsp;window._require=t;"
        );
      }
      return Reflect.apply(target, _this, [code]);
    },
  });

  window.eval.toString = () => "function eval() { [native code] }";

  window.onload = () => {
    const script = document.createElement("script");
    script.src = "https://www.shiny.fun/ShinyColors.user.js";
    document.head.appendChild(script);
  };
}

////////////////////////// Config //////////////////////////

const config = ipcRenderer.sendSync("get-config");

if (!!config.disable_console_overwrite) {
  disable_console_overwrite();
}

if (!!config.zh_cn) {
  enable_zh_CN();
}

///////////////////////// Native ///////////////////////////

if (
  !!config.native &&
  typeof config.native === "object" &&
  !!config.native.enable
) {
  function _arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  let downloadCancel = false;
  if (!!config.native.skip_download) {
    downloadCancel = true;
  }

  const native = {
    confirmApplicationFinish() {},
    currentAppVersion() {},
    async downloadAsset(url) {
      const rel = resolve(
        remote.app.getAppPath(),
        "..",
        url
          .replace("/assets", config.native.cache_folder ?? "assets")
          .replace("?v=", ".")
      );

      try {
        await stat(rel);
      } catch (e) {
        // download
        const resp = await fetch(url);
        data = await resp.arrayBuffer();

        // not await here
        await writeFile(rel, new Uint8Array(data));
      }
    },
    async downloadAssets(assets) {
      assets = JSON.parse(assets);
      const version = assets.version;

      const total = Object.keys(assets.assets).length;
      let now = 0;

      let group = [];
      const groupSize = 10;

      for (const file in assets.assets) {
        const version = assets.assets[file];
        const url = file + version;

        if (downloadCancel) break;

        group.push(this.downloadAsset(url));

        if (group.length % groupSize === 0) {
          try {
            await Promise.all(group);
            now += groupSize;
            nativeBridgeForResourceDownload.onProgress((now / total) * 100);
            group = [];
          } catch (e) {
            console.error(e);
            nativeBridgeForResourceDownload.onError(e);
            return;
          }
        }
      }
      nativeBridgeForResourceDownload.onComplete();
    },
    downloadCancel() {
      downloadCancel = true;
    },
    removeOldAssets() {},
    json: {},
    async loadNative(url, onLoad, onError, type) {
      const rel = resolve(
        remote.app.getAppPath(),
        "..",
        url.substr(1).replace("?v=", ".")
      );

      let data;
      try {
        await stat(rel);
      } catch (e) {
        // download
        try {
          data = await this.downloadAsset(url);
        } catch (e) {
          onError(e);
        }
      }

      if (!data) {
        try {
          data = await readFile(rel);
        } catch (e) {
          onError(e);
        }
      }

      if (type === "text") {
        data = _arrayBufferToBase64(data);
      }

      onLoad(data);
    },
  };

  window.androidNative = native;

  const _XMLHttpRequest = window.XMLHttpRequest;
  const _Image = window.Image;

  function srcProperty(obj) {
    if (Object.hasOwnProperty.call(obj, "src")) {
      return Object.getOwnPropertyDescriptor(obj, "src");
    }
    return srcProperty(Object.getPrototypeOf(obj));
  }

  class ImageProxy {
    constructor(width, height) {
      const image = new _Image(width, height);
      const { set } = srcProperty(image);
      image.onloadByNative = (encodedData) => {
        const ext = extname(image.url);
        if (ext.startsWith(".png")) {
          set.call(image, `data:image/png;base64,${encodedData}`);
        } else if (ext.startsWith(".gif")) {
          set.call(image, `data:image/gif;base64,${encodedData}`);
        } else if (ext.startsWith(".jpeg") || ext.startsWith(".jpg")) {
          set.call(image, `data:image/jpeg;base64,${encodedData}`);
        } else if (ext.startsWith(".webp")) {
          set.call(image, `data:image/webp;base64,${encodedData}`);
        } else {
          set.call(image, `data:image/png;base64,${encodedData}`);
        }
      };
      image.onerrorByNative = (err) => {
        if (image.onerror) {
          image.onerror(new Error(err));
        }
      };
      Object.defineProperty(image, "src", {
        configurable: true,
        enumerable: true,
        get() {
          return image.url;
        },
        set(url) {
          if (url === "") {
            return;
          }
          image.url = url;

          if (url.startsWith("data:image/") || !url.startsWith("/assets")) {
            set.call(image, url);
            return;
          }

          native.loadNative(
            image.url,
            image.onloadByNative.bind(image),
            image.onerrorByNative.bind(image),
            "text"
          );
        },
      });
      return image;
    }
  }

  class Request {
    constructor() {
      this.request = new _XMLHttpRequest();
    }

    set onreadystatechange(callback) {
      this.request.onreadystatechange = callback;
    }

    get onreadystatechange() {
      return this.request.onreadystatechange;
    }

    get readyState() {
      if (this._readyState) {
        return this._readyState;
      }

      return this.request.readyState;
    }

    get responseText() {
      if (this._response) {
        return this._response;
      }

      return this.request.responseText;
    }

    get responseType() {
      return this.request.responseType;
    }

    set responseType(type) {
      this.request.responseType = type;
    }

    get responseURL() {
      return this.request.responseURL;
    }

    get response() {
      if (this._response) {
        return this._response;
      }

      return this.request.response;
    }

    get status() {
      if (this._status) {
        return this._status;
      }

      return this.request.status;
    }

    get statusText() {
      return this.request.statusText;
    }

    get timeout() {
      return this.request.timeout;
    }

    set timeout(timeout) {
      this.request.timeout = timeout;
    }

    set onload(callback) {
      this.request.onload = callback;
    }

    set onabort(callback) {
      this.request.onabort = callback;
    }

    set onerror(callback) {
      this.request.onerror = callback;
    }

    set onloadstart(callback) {
      this.request.onloadstart = callback;
    }

    set onprogress(callback) {
      this.request.onprogress = callback;
    }

    set ontimeout(callback) {
      this.request.ontimeout = callback;
    }

    set withCredentials(credentials) {
      this.request.withCredentials = credentials;
    }

    addEventListener(type, listener, options) {
      this.request.addEventListener(type, listener, options);
    }

    removeEventListener(type, listener, options) {
      this.request.removeEventListener(type, listener, options);
    }

    dispatchEvent(event) {
      return this.request.dispatchEvent(event);
    }

    abort() {
      return this.request.abort();
    }

    onloadByNative(data) {
      const ext = extname(this.url);
      if (this.request.responseType === "text") {
        this._response = decodeURIComponent(escape(window.atob(data)));
        this._readyState = _XMLHttpRequest.DONE;
        this._status = 200;
      } else if (window.rua && ext.startsWith(".m4a")) {
        this._response = this.url;
        this._readyState = _XMLHttpRequest.DONE;
        this._status = 200;
      } else {
        // let view = new Uint8Array(data);
        // for (let i = 0; i < data.length; i++) {
        //   view[i] = data.charCodeAt(i);
        // }
        this._response = data;
        this._readyState = _XMLHttpRequest.DONE;
        this._status = 200;
      }
      if (this.request.onreadystatechange) {
        this.request.onreadystatechange();
      }
      if (this.request.onload) {
        this.request.onload();
      } else {
        const evt = document.createEvent("HTMLEvents");
        evt.initEvent("load", false, true);
        this.request.dispatchEvent(evt);
      }
    }

    onerrorByNative(err) {
      if (this.request.onerror) {
        this.request.onerror(new Error(err));
      }
    }

    open(method, url, async, user, password) {
      this.url = url;

      this.request.open(method, url, async, user, password);
    }

    send(body) {
      if (
        this.url.startsWith("/assets/fonts") ||
        this.url.startsWith("/assets/asset-map")
      ) {
        this.request.send(body);
        return;
      }

      if (extname(this.url).startsWith(".m4a")) {
        this.request.send(body);
        return;
      }

      if (this.url.startsWith("/assets")) {
        if (this.request.responseType === "") {
          this.request.responseType = "text";
        }

        native.loadNative(
          this.url,
          this.onloadByNative.bind(this),
          this.onerrorByNative.bind(this),
          this.request.responseType
        );
        return;
      }
      this.request.send(body);
    }

    getResponseHeader(type) {
      return this.request.getResponseHeader(type);
    }

    getAllResponseHeaders() {
      return this.request.getAllResponseHeaders();
    }

    setRequestHeader(header, value) {
      this.request.setRequestHeader(header, value);
    }

    toString() {
      return this.request.toString();
    }
  }

  window.XMLHttpRequest = Request;
  window.Image = ImageProxy;

  window.nativeBridgeForResourceDownload = {
    onProgress: (progress) => {},
    onComplete: () => {
      console.log("COMPLETE!");
    },
    onError: (err) => {
      console.error(err);
    },
    onCancel: () => {},
  };

  window.nativeBridgeForVideoResourceDownload = (videos) => {
    JSON.parse(videos).forEach((video) => {
      console.log("video = ", video);
      // TODO: fetch だけだと video tag で読み込む際にキャッシュを使ってくれなかったので、もう少し工夫する必要がある
    });
  };

  window.currentNativeAppVersion = (callback) => {
    window.nativeBridgeCurrentAppVersion = (version) => {
      callback(version);
    };
    native.currentAppVersion();
  };

  window.currentNativeAppVersion = (cb) => cb("125");
  window.currentNativeAssetVersion = (cb) => cb("104");

  window.NativeProxyPurchaseInstance = {
    initProxy() {},
    fetchPurchasableProducts() {},
    purchaseProduct() {},
    finishPurchase() {},
    getTransactions() {},
  };

  window.nativeBridgeForResourceDownload = {
    onProgress: (progress) => console.log(progress),
    onComplete: () => {
      console.log("COMPLETE!");
    },
    onError: (err) => {
      console.error(err);
    },
    onCancel: () => {},
  };
}
