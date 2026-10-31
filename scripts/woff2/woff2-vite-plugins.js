/**
 * Custom vite plugin that points the app at its own copy of the fonts and
 * preloads the default ones, so nothing is fetched from other hosts.
 *
 * @returns {import("vite").PluginOption}
 */
module.exports.woff2BrowserPlugin = () => {
  let isDev;
  let base = "/";

  return {
    name: "woff2BrowserPlugin",
    enforce: "pre",
    configResolved(config) {
      isDev = config.command === "serve";
      base = config.base;
    },
    transform(code, id) {
      if (!isDev && id.endsWith("excalidraw-app/index.html")) {
        const preload = (path) => `
      <link
        rel="preload"
        href="${base}fonts/${path}"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />`;

        return code.replace(
          "<!-- PLACEHOLDER:EXCALIDRAW_APP_FONTS -->",
          `<script>
        window.EXCALIDRAW_ASSET_PATH = window.location.origin + "/";
      </script>
      <!-- Preload the default fonts to avoid a swap on load -->${preload(
        "Excalifont/Excalifont-Regular-a88b72a24fb54c9f94e3b5fdaa7481c9.woff2",
      )}${preload(
            "Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2",
          )}${preload("Assistant/Assistant-SemiBold.woff2")}
    `,
        );
      }
    },
  };
};
