const RoutesInfo = require('@quoin/expressjs-routes-info');

const constants = require('./../lib/constants');
const OpenApiCall = require('./createOpenApiCall');

module.exports = (baseUrl) => {
    const routesInfo = new RoutesInfo('/', baseUrl);

    routesInfo.route(constants.ROUTE_NAME, '/openapi/{domain}', OpenApiCall);

    return routesInfo;
};
