# WarpJS openapi plugin

WarpJS implementation for the openapi plugin for WarpJS.

## Configuration

Add the following configuration to the `plugins` list:

    {
      "name": "OpenAPI plugin",
      "moduleName": "@warp-works/warpjs-openapi-plugin",
      "path": "/REST",
      "type": "action"
     }


## Usage

Adds REST-Endpoints to the current domain and creates an OpenAPI Documentation for the REST Endpoints.

## API

GET: {Server:Port}/{path}/openapi/{domain}

Returns OpenApi REDOX UI for the REST-Endpoints

## REST Endpoints

REST Endpoints can be reached based on the domain using the following address structure.

Address: {server:port}/{PATH}/{domain}/{entity}/{entityID}/{entity}/{entityID}/.....





