// const RoutesInfo = require('@quoin/expressjs-routes-info');
// const warpjsUtils = require('@warp-works/warpjs-utils');
const warpCore = require('@warp-works/core');
// const constants = require('./../../lib/constants');
const Domain = require('@warp-works/core/lib/models/domain');
const Entity = require('@warp-works/core/lib/models/entity');
// var createOpenApi = require('./createOpenApi');
// const constants = require('./../../lib/constants');

function createOpenApi(domainName, baseurl) {
    // creates and return entire OpenAPI Spec for a domain
    Domain.prototype.getOpenApi = function() {
        let openApiSpec = {};
        console.log(baseurl);
        // basepath = "/app"
        // TODO get the IP dynamically
        openApiSpec = new CreateApiSpec(baseurl, '/content/REST/' + this.name);

        openApiSpec.paths = {};
        openApiSpec.definitions = {};

        this.getEntities().forEach(function(entity) {
            // No Root Entity and only Document get Paths
            if (typeof (entity.name) !== "undefined" && entity.isRootInstance !== true && entity.isAbstract !== true && entity.getAllParentAggregations().length < 2) {
                // If is document (not embedded) Create path -
                var parentAgg = entity.getParentAggregation();

                if (entity.isDocument()) {
                    if (entity.isRootEntity || parentAgg.parent.isRootInstance) {
                        openApiSpec.paths["/" + parentAgg.name] = entity.entityEndpoint(["POST"], null);
                        openApiSpec.paths["/" + parentAgg.name + "/{" + entity.name + "_id}"] = entity.entityInstanceEndpoint();
                    } else {
                        openApiSpec.paths["/" + parentAgg.parent.getParentAggregation().name + "/{" + parentAgg.parent.name + "_id}/" + parentAgg.name] = entity.entityEndpoint(["POST"], parentAgg.parent.name);
                        openApiSpec.paths["/" + parentAgg.name + "/{" + entity.name + "_id}"] = entity.entityInstanceEndpoint();
                    }
                }

                /*
else{

var path = "";
var curEntity = entity;
while(curEntity.isDocument !== true)
{
var curParentAgg = curEntity.getParentAggregation();
path = "/"+curParentAgg.name+"/{"+curEntity.name+"_id}"+ path ;
console.log(path);
curEntity = curParentAgg.parent;
}

path = curEntity.name +"/{"+curEntity.name+"_id}"+path;
openApiSpec.paths[path] = entity.entityInstanceEndpoint();
}
//add functionality for get on embedded docs.
openApiSpec.paths["/{PATHTOPARENTENTITY}"+entity.name] = {};
openApiSpec.paths["/"+entity.name] = entity.entityEndpoint();
openApiSpec.paths["/"+entity.name+"/{"+entity.name+"_id}"] = entity.entityInstanceEndpoint();
*/
            }

            // All Entities are getting OPEN API References
            if (entity.name !== null && entity.name !== undefined && !entity.isRootInstance && !entity.isAbstract) {
                openApiSpec.definitions[entity.name] = entity.entityReferences();
                let embeddedEntities = {};
                let relNames = [];
                embeddedEntities = entity.getEmbeddedEntities();
                // If embeddedEntities exist they must be defined.
                if (embeddedEntities) {
                    Object.keys(embeddedEntities).forEach(function(key) {
                        relNames.push(key);
                        openApiSpec.definitions[key] = entity.getSwaggerAggregations(embeddedEntities[key].name);
                    });
                    openApiSpec.definitions[entity.name + "Aggregation"] = getRelationshipEmbedded(relNames);
                }
                // If Associations exist they must be defined.

                let assocs = entity.getAssociations();
                let assocNames = [];
                if (assocs.length > 1) {
                    assocs.forEach(function(association) {
                        // console.log(typeof(association.type));
                        assocNames.push(association.name);
                        openApiSpec.definitions[entity.name + "AssociationItem"] = getAssociation(association, entity, assocs.length);
                    });

                    openApiSpec.definitions[entity.name + "Association"] = getRelationshipEmbedded(assocNames);
                } else if (assocs.length === 1) {
                    assocs.forEach(function(association) {
                        assocNames.push(association.name);
                        openApiSpec.definitions[entity.name + "Association"] = getAssociation(association, entity, 1);
                    });
                }
            }
        });
        function getAssociation(association, entity, count) {
            if (count > 1) {
                return {
                    allOf: [{$ref: '#/definitions/' + entity.name + "Association"}, {type: "object", required: [association.type + "ID"], properties: {[association.type + "ID"]: {type: "string", enum: [association.id]}, [association.type + "Name"]: {type: "string", enum: [association.name]}, desc: {type: "string", enum: [association.desc]}, data: {type: "array", items: {type: "object", properties: {_id: {type: "string"}, type: {type: "string"}, desc: {type: "string"}}}}}}] };
            } else {
                return {type: "object",
                    required: [association.type + "ID"],
                    properties: {[association.type + "ID"]: {type: "string", enum: [association.id]},
                        [association.type + "Name"]: {type: "string", enum: [association.name]},
                        description: {type: "string", enum: [association.desc]},
                        data: {type: "array", items: {type: "object", properties: {_id: {type: "string"}, type: {type: "string"}, desc: {type: "string"}}}, description: "Array of Ids of the associated entities"
                        }
                    }
                };
            }
        }

        function getRelationshipEmbedded(relNames) {
            let swagger = {};
            swagger['discriminator'] = "parentRelnName";
            swagger['required'] = ["parentRelnName"];
            swagger['properties'] = {parentRelnID: {type: 'integer'}, parentRelnName: {type: "string", enum: relNames}};

            return swagger;
        };
        function CreateApiSpec(IP, basepath) {
            const OpenApi = {
                swagger: "2.0",
                info: {
                    version: "0.0.1",
                    title: "Simple API",
                    description: "A simple OpenAPI Specification"
                },
                schemes: [
                    "http"
                ],

                host: IP,
                basePath: basepath,
                produces: ["application/json"]

            };
            return OpenApi;
        };

        return JSON.stringify(openApiSpec);
    };

    // gets OpenApiSchema for an entity
    Entity.prototype.getOpenApiSchema = function() {
        let entityswagger = {};
        let entName = this.name;
        // add BasicProperties

        entityswagger['id'] = {type: "string",
            description: " A unique identifier of the " + entName + " Automatically assigned by the API when created."};
        entityswagger['path'] = {type: "string",
            description: "The relativ path to this specific entity, generated by the server"};
        entityswagger['type'] = {type: "string", enum: [entName]};

        this.getBasicProperties().forEach(function(property) {
            entityswagger[property.name] = {};

            // date not recognized
            if (property.propertyType === 'date') {
                entityswagger[property.name] = {type: "string", format: "date"};
            } else {
                entityswagger[property.name] = {type: property.propertyType};
            }
        });
        // addEnums
        this.getEnums().forEach(function(en) {
            let enumeration = [];
            entityswagger[en.name] = {};
            en.literals.forEach(function(lit) {
                enumeration.push(lit.name);
            });
            entityswagger[en.name] = {type: "string", enum: enumeration};
        });
        // customer.getAllParentAggregations() für die Listen.
        this.getAggregations().forEach(function(agg) {
            const target = agg.getTargetEntity();
            if (!target.isDocument()) {
                entityswagger["embedded"] = {type: "array", items: {$ref: "#/definitions/" + entName + "Aggregation"}};
            }
        });
        // getAllAssociations
        this.getAssociations().forEach(function(assoc) {
            entityswagger["associations"] = {type: "array", items: {$ref: "#/definitions/" + entName + "Association"}};
        });
        // get the parent info
        entityswagger["parentID"] = {type: "string", description: "The ID of the direct parent entity"};
        var parentAgg = this.getParentAggregation();
        entityswagger["parentRelnID"] = {type: "string", enum: [parentAgg.id], description: "The ID of the parent relation"};
        entityswagger["parentRelnName"] = {type: "string", enum: [parentAgg.name], description: "The name of the parent relation"};
        entityswagger["parentBaseClassName"] = {type: "string", enum: [parentAgg.parent.name], description: "The Name of the Parents Baseclass"};

        return entityswagger;
    };
    Entity.prototype.getParentAggregation = function() {
        if (this.getAllParentAggregations().length > 0) {
            return this.getAllParentAggregations()[0];
        } else {
            var curParentClass = this.getParentClass();

            return curParentClass.getParentAggregation();
        }
    };
    // gets the embedded entities of an entity
    Entity.prototype.getEmbeddedEntities = function() {
        let embedded = {};
        this.getAggregations().forEach(function(agg) {
            const target = agg.getTargetEntity();
            if (!target.isDocument()) {
                embedded[agg.name] = target;
            }
        });
        if (Object.keys(embedded).length === 0 && embedded.constructor === Object) {
            return false;
        } else {
            return embedded;
        }
    };

    // gets the  OpenAPI Spec of the embedded entities
    Entity.prototype.getSwaggerAggregations = function(embName) {
        let swagger = {};
        swagger["allOf"] = [{$ref: "#/definitions/" + this.name + "Aggregation"}];
        swagger["allOf"].push({type: "object", required: ["Entities"], properties: {Entities: {type: "array", items: {$ref: "#/definitions/" + embName}}}});

        return swagger;
    };
    Entity.prototype.getSwaggerAssociations = function(embName) {
        let swagger = {};
        swagger["allOf"] = [{$ref: "#/definitions/" + this.name + "Association"}];
        swagger["allOf"].push({type: "object", properties: {Entities: {type: "array", items: {$ref: "#/definitions/" + embName}}}});

        return swagger;
    };

    // creates the references of an entity
    Entity.prototype.entityReferences = function() {
        // getProperties and Embedded SPEC

        let definitions = {};
        if (this.getEmbeddedEntities()) {
            definitions.required = ["embedded"];
        }
        definitions.type = "object";
        definitions.properties = {};
        definitions.properties = this.getOpenApiSchema();

        return definitions;
    };

    // created the endpoint of an entity
    Entity.prototype.entityEndpoint = function(array, innerEntity) {
        let paths = {};
        // for embedded Entities create -- /customer/{customerID}/myOrders/{OrderID}

        for (var http in array) {
            paths[array[http].toLowerCase()] = createEntityEndpoint(this, array[http], innerEntity);
        }

        return paths;

        function createEntityEndpoint(ent, restCommand, innerEntity) {
            // optional Parameter if there is a parent id in path
            var parameters = [];
            parameters.push({in: "body",
                name: "body",
                description: ent.name + " object that needs to be added ",
                required: true,
                schema: {$ref: "#/definitions/" + ent.name}});
            if (innerEntity !== null) {
                parameters.push({in: "path", name: innerEntity + "_id", required: true, type: typeof (innerEntity), description: innerEntity + "_id that needs to be updated "});
            }

            switch (restCommand) {
                case "GET":
                    return {tags: [ent.name],
                        summary: "Gets a list of " + ent.namePlural,
                        description: "A list of" + ent.namePlural,

                        responses: {
                            200: {
                                description: "Returns a list of " + ent.namePlural,

                                schema: {
                                    type: "array", items: {$ref: "#/definitions/" + ent.name}
                                }

                            }
                        }
                    }
                    ;
                case "POST":
                    return {tags: [ent.name],
                        summary: "Create a new " + ent.name,
                        description: "",
                        consumes: ["application/json"],
                        produces: ["application/json"],
                        parameters: parameters,
                        responses: {
                            200: {description: "The " + ent.name + " has been successfully patched", schema: {$ref: "#/definitions/" + ent.name}},
                            400: {description: "Could not create the Entity due to wrong Syntax"}}};
                case "PUT":
                    break;
                case "DELETE":
                    break;
            }
            return "ERROR";
        }
        // create Endpoints for Aggregations i.E Customer/{custid}/myOrders/{OrderID}/addresses/{addressid}
    };

    Entity.prototype.entityInstanceEndpoint = function() {
        // for embedded Entities create -- /customer/{customerID}/myOrders/{OrderID}
        let paths = {};
        paths["get"] = createEntityInstanceEnpoint(this, "GET");
        paths["put"] = createEntityInstanceEnpoint(this, "PUT");
        paths["delete"] = createEntityInstanceEnpoint(this, "DELETE");
        paths["patch"] = createEntityInstanceEnpoint(this, "PATCH");

        // create Endpoints for Aggregations i.E Customer/{custid}/myOrders/{OrderID}/addresses/{addressid}
        return paths;

        function createEntityInstanceEnpoint(ent, restCommand) {
            switch (restCommand) {
                case "GET":
                    return {tags: [ent.name],
                        summary: "Lookup a specific " + ent.name + " by ID",
                        description: "Returns a single " + ent.name,
                        produces: ["application/json"],
                        parameters: [{name: ent.name + "_id",
                            in: "path",
                            description: "ID of " + ent.name + " to lookup",
                            required: true,
                            type: "string"}],
                        responses: {
                            200: {
                                description: "An array with the entity " + ent.name,

                                schema: {
                                    $ref: "#/definitions/" + ent.name
                                }
                            },
                            400: {
                                description: "Invalid ID supplied"
                            },
                            404: {
                                description: ent.name + " not found"

                            }
                        }
                    };
                case "PUT":

                    return {tags: [ent.name],
                        summary: "Updates an existing " + ent.name,
                        description: "Sends an updated version of an entire " + ent.name + " to the server",
                        consumes: ["application/json"],
                        produces: ["application/json"],
                        parameters: [{in: "path", name: ent.name + "_id", required: true, type: "string", description: ent.name + "_id that needs to be updated "}, {in: "body",
                            name: ent.name + "_Body ",
                            description: "Full Body of " + ent.name + " Document",
                            schema: {$ref: "#/definitions/" + ent.name},
                            required: true

                        }],
                        responses: {400: {description: "Invalid input"},
                            200: {description: "The " + ent.name + " has been successfully updated", schema: {$ref: "#/definitions/" + ent.name}}}};

                case "DELETE":
                    return {tags: [ent.name],
                        summary: "Delete an existing " + ent.name,
                        description: "Delets an entire " + ent.name + " from the db",
                        consumes: ["application/json"],
                        produces: ["application/json"],
                        parameters: [{in: "path", name: ent.name + "_id", required: true, type: "string"}],
                        responses: {400: {description: "Invalid ID supplied"},
                            204: {description: "The " + ent.name + " has been successfully deleted"}}};
                case "PATCH":
                    return {tags: [ent.name],
                        summary: "Patches an existing " + ent.name,
                        description: "Delets an entire " + ent.name + " from the db",
                        consumes: ["application/json"],
                        produces: ["application/json"],
                        parameters: [{in: "path", name: ent.name + "_id", required: true, type: "string", description: ent.name + "_id that needs to be updated "},
                            {in: "body",
                                name: ent.name + "_Body ",
                                description: "Full Body of " + ent.name + " Document",
                                schema: {
                                    description: "A Patch Document that needs the key and the value",
                                    required: ["key", "value"],
                                    type: "object",
                                    properties: {
                                        key: {
                                            type: "string",
                                            description: "The property that should be patched"},
                                        value: {
                                            type: "string",
                                            description: "The new value that patches the previous value"
                                        }
                                    }
                                }}],
                        responses: {
                            400: {description: "Invalid Input "},
                            200: {description: "The " + ent.name + " has been successfully patched",
                                schema: {$ref: "#/definitions/" + ent.name}}
                        }};
            };
        }
    };
    var domain = warpCore.getDomainByName(domainName);

    return domain.getOpenApi();
};

module.exports = (req, res) => {
    var domain = req.params.domain;
    // create Variable
    res.status(200).render('index', {
        title: "REST Specification of Domain " + domain,
        openapi: createOpenApi(domain, req.get('host')),
        baseUrl: res.app.get('base-url'),
        staticUrl: res.app.get('static-url')
    });
//    var openApiJson = createOpenApi(domain);
//    console.log(openApiJson);
};
