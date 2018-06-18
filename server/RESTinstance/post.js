const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');
const uuid = require('uuid/v4');

const utils = require('./../utils');
const logger = require('./../loggers');
const serverUtils = require('@warp-works/warpjs/lib/utils');
const _ = require('lodash');

module.exports = (req, res) => {
    var params = req.params[0].split("/");

    if (params.length <= 2) {
        const domain = params.splice(0, 1)[0];
        const domainInstance = serverUtils.getDomain(domain);
        const pluralName = params.splice(0, 1)[0];
        const targetEntity = domainInstance.getEntityByPluralName(pluralName);
        const entity = domainInstance.getEntityByName(domainInstance.name);
        const type = targetEntity.name;
        const relationshipEntity = entity.getRelationshipByChildName(type);

        // FIXME: What happens for a password? The password should not be managed
        // with the "content" side of things, and should not, be using this
        // end-point.
        const persistence = serverUtils.getPersistence(domain);
        // find the ID of the root
        var id;
        return Promise.resolve().then(() => persistence.collection(domain))
            .then((col) => col.findOne({}, function(err, result) {
                if (err) {
                    throw err;
                }

                if (typeof (result["_id"]) !== 'undefined') {
                    const id = result["_id"].toString();
                    createNewDoc(id, persistence, domain, type, entity, targetEntity, relationshipEntity, req, res);
                } else {
                    logger(req, "Could not create the Entity", {err});
                    const resource = warpjsUtils.createResource(req, {
                        domain,
                        type,
                        id,
                        body: req.body,
                        message: err.message
                    });
                    utils.sendJSON(req, res, resource, 400);
                }
            }));
    } else {
        const domain = params.splice(0, 1)[0];
        const domainInstance = serverUtils.getDomain(domain);
        const parent = domainInstance.getEntityByPluralName(params.splice(0, 1)[0]);
        const id = params.splice(0, 1)[0];
        const nestedPluralEntity = params.splice(0, 1)[0];

        // console.log(parent);
        const entity = domainInstance.getEntityByPluralName(nestedPluralEntity);

        const nestedRelationShip = parent.getRelationshipByChildName(entity.name);
        const collection = entity.name;
        // FIXME: What happens for a password? The password should not be
        // managed
        // with the "content" side of things, and should not, be using this
        // end-point.
        const persistence = serverUtils.getPersistence(domain);

        if (entity.entityType !== "Document") {
            // Something is missing here.
            params.unshift(nestedPluralEntity);

            return Promise.resolve(createEmbDoc(id, persistence, domainInstance, collection, parent, req, res, params));
        } else {
            return Promise.resolve(createNewDoc(id, persistence, domain, collection, parent, entity, nestedRelationShip, req, res));
        }
    }

    function createNewDoc(id, persistence, domain, type, entity, targetEntity, relationshipEntity, req, res) {
        return Promise.resolve()
            .then(() => logger(req, "Trying to create new aggregation"))
            .then(() => entity.getInstance(persistence, id))
            .then((instance) => entity.createChildForInstance(instance, relationshipEntity))
            .then((child) => targetEntity.createDocument(persistence, child))
            .then((newDoc) => insertData(req.body, newDoc, persistence))
            .then((dirtyDoc) => removeMeta(dirtyDoc))
            .then((createdDocument) => {
                persistence.update(type, createdDocument);

                utils.sendJSON(req, res, createdDocument);
            }
            )
            .catch((err) => {
                logger(req, "Could not create the Entity", {err});
                const resource = warpjsUtils.createResource(req, {
                    domain,
                    type,
                    id,
                    body: req.body,
                    message: err.message
                });
                utils.sendJSON(req, res, resource, 400);
            })
            .finally(() => persistence.close());
    }
    function createEmbDoc(id, persistence, domain, type, entity, req, res, params) {
        return Promise.resolve()
            .then(() => logger(req, "Trying to create new aggregation"))
            .then(() => entity.getInstance(persistence, id))
            .then((instance) => addEmbeddedEntity(params, instance, preparePayload(domain, req), persistence, domain))
            .then((dirtyDoc) => removeMeta(dirtyDoc))
            .then((updatedDoc) => {
                entity.updateDocument(persistence, updatedDoc);

                utils.sendJSON(req, res, updatedDoc);
            }
            )
            .catch((err) => {
                logger(req, "Could not create the Entity", {err});
                var name = domain.name;
                const resource = warpjsUtils.createResource(req, {
                    name,
                    type,
                    id,
                    body: req.body,
                    message: err.message
                });
                utils.sendJSON(req, res, resource, 400);
            })
            .finally(() => persistence.close());
    }

    // Call per Entity without relationship
    function insertData(payload, newDoc, persistence) {
        var payloadWithId = addObjectId(payload, false, persistence);
        var createdDocument = _.merge(payloadWithId, newDoc);
        return createdDocument;

        // add object.ids and maybe later path
    }
    function addObjectId(payload, firstEmbedded, persistence) {
    // check if there are embedded entities, only those need ids
        if (typeof (payload.embedded) !== "undefined" && payload.embedded.length > 0) {
        // iterate through all relations and all entities
            for (var relationship in payload.embedded) {
                var entities = payload.embedded[relationship].entities;

                if (entities.length > 0) {
                    for (var entity in entities) {
                        if (typeof (entities[entity].path) === 'undefined') {
                            payload.embedded[relationship].entities[entity].path = "";
                        }

                        // add object id and call recursive if further embedded
                        if (typeof (entities[entity]["_id"]) === 'undefined') {
                            payload.embedded[relationship].entities[entity]["_id"] = uuid();
                            if (entities[entity].embedded.length > 0) {
                                payload.embedded[relationship].entities[entity] = addObjectId(entities[entity], false, persistence);
                            }
                        }
                    }
                }
            }
        }
        // If we add an embedded document without id -> add a new one and call recursively for all embedded ids.

        if (firstEmbedded === true) {
            payload["_id"] = uuid();
            addObjectId(payload, false, persistence);
        }

        // If we add an embedded document without id -> we have to add a new one and call recursively for all further ids.

        return payload;
    }

    function addEmbeddedEntity(searchstring, instance, payload, persistence, domain) {
        if (searchstring.length > 1) {
            var instanceEntity = domain.getEntityByName(instance.type);
            var child = domain.getEntityByPluralName(searchstring.splice(0, 1)[0]);
            var newRelationship = instanceEntity.getRelationshipByChildName(child.name);

            var searchRel = newRelationship.name;
            var searchID = searchstring.splice(0, 1)[0];

            // check if there are embedded entities, only those need ids
            for (var rel in instance.embedded) {
                if (searchRel === instance.embedded[rel].parentRelnName) {
                    for (var ent in instance.embedded[rel].entities) {
                        if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
                            instance.embedded[rel].entities[ent] = addEmbeddedEntity(searchstring, instance.embedded[rel].entities[ent], payload, persistence, domain);
                            return instance;
                        }
                    }
                }
            }
        } else {
            var pluralName = searchstring[0];
            instanceEntity = domain.getEntityByName(instance.type);
            child = domain.getEntityByPluralName(searchstring.splice(0, 1)[0]);
            newRelationship = instanceEntity.getRelationshipByChildName(child.name);

            if (typeof (newRelationship) === 'undefined') {
                throw new Error('There is no Relationship for Entity: ' + pluralName);
            }

            if (typeof (instance.embedded) === 'undefined') {
                instance.embedded = [];
                instance.embedded.push({

                    parentRelnID: newRelationship.id,
                    parentRelnName: newRelationship.name,
                    entities: [addObjectId(payload, true, persistence)
                    ]
                });
            } else {
                for (rel in instance.embedded) {
                    if (instance.embedded[rel].parentRelnName === newRelationship.name) {
                        instance.embedded[rel].entities.push(addObjectId(payload, true, persistence));
                    }
                }
            }
        }
        return instance;
    }

    function removeMeta(instance) {
        return Promise.resolve()
            .then(() => {
                if (typeof (instance["_meta"]) !== "undefined") {
                    delete instance['_meta'];
                }
                return instance;
            });
    }

    function preparePayload(domain, req) {
        var pluralName = req.params[0].split("/")[req.params[0].split("/").length - 1];
        var type = domain.getEntityByPluralName(pluralName).name;
        var payload = req.body;
        payload["type"] = type;
        return payload;
    }
};
