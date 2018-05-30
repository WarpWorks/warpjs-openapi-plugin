const express = require('express');
const path = require('path');
const repoRoot = path.dirname(require.resolve('./../package.json'));
const routes = require('./routes');

module.exports = (config, warpCore, baseUrl, staticUrl) => {
    const app = express();
    var viewpath = path.join(repoRoot, 'views');
    baseUrl = (baseUrl === '/') ? '' : baseUrl;
    app.set('view engine', 'hbs');
    app.set('views', viewpath);
    app.set('base-url', baseUrl);
    app.set('static-url', staticUrl);
    app.set('plugin-config', config);
    app.set('warpjs-core', warpCore);

    app.use('/assets', express.static(path.join(repoRoot, 'assets')));

    app.use(routes(baseUrl || '/').router);

    return app;
};
