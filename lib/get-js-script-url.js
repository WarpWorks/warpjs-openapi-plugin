
const RoutesInfo = require('@quoin/expressjs-routes-info');

const constants = require('./constants');

module.exports = () => `${RoutesInfo.expand(constants.routes.assets, {})}/${constants.assets.js}`;
