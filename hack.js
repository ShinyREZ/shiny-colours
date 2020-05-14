var old_func = {
  "document.createElement": document.createElement.bind(document),
  "document.createElementNS": document.createElementNS.bind(document)
};

document.createElement = function(name, options) {
  const elem = old_func["document.createElement"](name, options);
  if (name === "canvas") {
    const func = elem.getContext.bind(elem);
    elem.getContext = function() {
      const ctx = func(...arguments);
      return proxy_canvas_context(ctx);
    };
  }
  return elem;
};

document.createElementNS = function(namespace, name, options) {
  const elem = old_func["document.createElementNS"](...arguments);
  if (name === "canvas") {
    const func = elem.getContext.bind(elem);
    elem.getContext = function() {
      const ctx = func(...arguments);
      return proxy_canvas_context(ctx);
    };
  }
  return elem;
};

function help_proxy(handler) {
  return function(element) {
    return new Proxy(element, {
      set: function(target, key, value) {
        // console.log("set", key, value);
        target[key] = value;
        return true;
      },
      get: function(target, key) {
        // console.log("get", key);
        if (key in handler) {
          return handler[key](target);
        }

        if (typeof target[key] === "function") {
          return target[key].bind(target);
        }

        return target[key];
      }
    });
  };
}

function proxy_canvas_context(ctx) {
  return help_proxy({
    fillText: _this => {
      const func = _this.fillText.bind(_this);
      return function(text, x, y, maxWidth) {
        return func(text, x, y, maxWidth);
      };
    },
    drawImage: _this => {
      const func = _this.drawImage.bind(_this);
      return function() {
        const args = [...arguments];
        return func(...args);
      };
    },
    texImage2D: _this => {
      const func = _this.texImage2D.bind(_this);
      return function() {
        const args = [...arguments];
        return func(...args);
      };
    },
    texSubImage2D: _this => {
      const func = _this.texSubImage2D.bind(_this);
      return function() {
        const args = [...arguments];
        return func(...args);
      };
    }
  })(ctx);
}

setInterval(() => {
  window.console = console;
}, 1000);
