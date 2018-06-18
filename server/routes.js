const RoutesInfo = require('@quoin/expressjs-routes-info');

const constants = require('./../lib/constants');
const OpenApiCall = require('./createOpenApiCall');
const RESTinstance = require('./RESTinstance');

const ROUTE_OPTIONS = {
    allowPatch: 'application/json'
};
module.exports = (baseUrl) => {
    const routesInfo = new RoutesInfo('/', baseUrl);

    routesInfo.route(constants.ROUTE_NAME, '/openapi/{domain}', OpenApiCall);
    routesInfo.route(constants.ROUTE_NAME + "REST", '/*', RESTinstance, ROUTE_OPTIONS);

    return routesInfo;
};
