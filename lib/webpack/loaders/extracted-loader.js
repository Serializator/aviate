// Based on github.com/sheerun/extracted-loader
/* eslint-disable no-irregular-whitespace */
module.exports = function(source) {
  if (source.match('module.hot')) {
    return source
  }

  return (
    source +
    `;
    if (module.hot) {
      var injectCss = function injectCss(prev, href) {
        var link = prev.cloneNode();
        link.href = href;
        link.onload = link.onerror = function() {
          prev.parentNode.removeChild(prev);
        };
        prev.stale = true;
        prev.parentNode.insertBefore(link, prev.nextSibling);
      };
      module.hot.dispose(function() {
        window.__webpack_reload_css__ = true;
      });
      module.hot.accept();
      if (window.__webpack_reload_css__) {
        module.hot.__webpack_reload_css__ = false;
        console.log("[HMR] Reloading stylesheets...");
        var prefix = ${this.options.output.publicPath
          ? `'${this.options.output.publicPath}'`
          : `document.location.protocol + '//' + document.location.host`};
        document
          .querySelectorAll("link[href][rel=stylesheet]")
          .forEach(function(link) {
            if (!link.href.match(prefix) || link.stale) return;
            injectCss(link, link.href.split("?")[0] + "?unix=${Number(
              new Date()
            )}");
          });
      }
    }
  `
  )
}
