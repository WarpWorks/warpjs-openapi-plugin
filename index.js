const app = require('./server/app');
const getJsScriptUrl = require('./lib/get-js-script-url');
const getPluginIdentifier = require('./lib/get-plugin-identifier');
function plugin(config, warpCore, Persistence) {
    // here
    return (baseUrl, staticUrl) => app(config, warpCore, baseUrl, staticUrl);
}
plugin.getJsScriptUrl = () => getJsScriptUrl();
plugin.getPluginIdentifier = () => getPluginIdentifier();

module.exports = plugin;
