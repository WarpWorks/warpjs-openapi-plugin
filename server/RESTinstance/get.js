const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');
const logger = require('./../loggers');
const utils = require('./../utils');
var _ = require('lodash');

module.exports = (req, res) => {
    var params = req.params[0].split("/");
    const domain = params.splice(0, 1)[0];
    const pluralNameEntity = params.splice(0, 1)[0];
    const id = params.splice(0, 1)[0];
    Promise.resolve(warpjsUtils.getDomain(domain))
        .then(domainInstance => {
            return Promise.all([domainInstance.getEntityByPluralName(pluralNameEntity), domainInstance]);
        })
        .then(returnArray => {
            const entity = returnArray[0];
            const domainInstance = returnArray[1];

            const persistence = warpjsUtils.getPersistence(domain);
            const currentPath = "/" + domain + "/" + pluralNameEntity;

            // If ID is given return ID

            // query root entities
            if (typeof (id) !== 'undefined' && params.length === 0) {
                return Promise.resolve()
                    .then(() => entity.getInstance(persistence, id))
                    .then((instance) => clean(instance, req, res, params, currentPath))
                    .then((EmptyAssocObj) => addAssocData(EmptyAssocObj, persistence))
                    .then((cleaned) => deepOmit(cleaned, ["_meta"]))
                    .then((returnInstance) => utils.sendJSON(req, res, JSON.stringify(returnInstance)))
                    .catch((err) => {
                        if (typeof (err.status) === 'undefined') {
                            err.status = 400;
                        }
                        logger(req, "Could not create the Entity", {err});
                        const resource = warpjsUtils.createResource(req, {
                            body: req.body,
                            message: err.message
                        });
                        utils.sendJSON(req, res, resource, err.status);
                    })
                    .finally(() => persistence.close());
            }

            // case  no id provided return all the data.

            if (typeof (id) === 'undefined') {
                var retItems = 100;

                if (req.query !== 'undefined') {
                    retItems = parseInt(req.query.retItems);
                }
                return Promise.resolve()
                    .then(() => entity.getDocumentsLimit(persistence, retItems))
                    .then((EmptyAssocObj) => addAssocData(EmptyAssocObj, persistence))
                    .then((cleaned) => deepOmit(cleaned, ["_meta"]))
                    .then((documents) => utils.sendJSON(req, res, JSON.stringify(documents)))
                    .catch((err) => {
                        if (typeof (err.status) === 'undefined') {
                            err.status = 400;
                        }

                        logger(req, "Could not create the Entity", {err});
                        const resource = warpjsUtils.createResource(req, {
                            body: req.body,
                            message: err.message
                        });
                        utils.sendJSON(req, res, resource, err.status);
                    })
                    .finally(() => persistence.close());
            }

            // case we are looking for non embedded Entites
            if (typeof (id) !== 'undefined' && params.length > 0) {
                var pluralName = params[0];
                // console.log(id);
                return Promise.resolve()
                    .then(() => domainInstance.getEntityByPluralName(pluralName))
                    .then((childEntity) => {
                        if (childEntity.entityType === 'Document') {
                            return Promise.resolve(childEntity.getChildInstances(persistence, id));
                        } else {
                            return Promise.resolve()
                                .then(() => entity.getInstance(persistence, id))
                                .then((instance) => clean(instance, req, res, params, currentPath));
                        }
                    })
                    .then((EmptyAssocObj) => addAssocData(EmptyAssocObj, persistence))
                // .then((cleaned) => deepOmit(cleaned,["_meta"]))
                    .then((childInstances) => utils.sendJSON(req, res, JSON.stringify(childInstances)))

                    .catch((err) => {
                        if (typeof (err.status) === 'undefined') {
                            err.status = 400;
                        }
                        logger(req, "Could not create the Entity", {err});
                        const resource = warpjsUtils.createResource(req, {
                            body: req.body,
                            message: err.message
                        });
                        utils.sendJSON(req, res, resource, err.status);
                    })
                    .finally(() => persistence.close());
            } else { // return all embedded Entities
                return Promise.resolve()
                    .then(() => entity.getInstance(persistence, id))
                    .then((instance) => clean(instance, req, res, params, currentPath))
                    .then((EmptyAssocObj) => addAssocData(EmptyAssocObj, persistence))
                    .then((cleaned) => deepOmit(cleaned, ["_meta"]))
                    .then((childInstances) => utils.sendJSON(req, res, JSON.stringify(childInstances)))

                    .catch((err) => {
                        if (typeof (err.status) === 'undefined') {
                            err.status = 400;
                        }

                        logger(req, "Could not create the Entity", {err});
                        const resource = warpjsUtils.createResource(req, {
                            body: req.body,
                            message: err.message
                        });
                        utils.sendJSON(req, res, resource, err.status);
                    })
                    .finally(() => persistence.close());
            }

            function clean(instance, req, res, params, currentPath) {
                if (!Object.keys(instance).length) {
                    var err = new Error('Cannot find entity with this ID');
                    err.status = 404;
                    throw err;
                } else {
                    var cleanPath = rebuildPath(instance, currentPath);
                    return Promise.resolve(findEntity(domainInstance.getEntityByName(instance.type), cleanPath, params));
                }
            }

            function findEntity(parent, instance, searchstring) {
                if (searchstring.length > 1) {
                    var pluralName = searchstring.splice(0, 1)[0];

                    var nestedEntity = domainInstance.getEntityByPluralName(pluralName);

                    var searchRel = parent.getRelationshipByChildName(nestedEntity.name).name;

                    var searchID = searchstring.splice(0, 1)[0];

                    // check if there are embedded entities, only those need ids
                    for (var rel in instance.embedded) {
                        if (searchRel === instance.embedded[rel].parentRelnName) {
                            for (var ent in instance.embedded[rel].entities) {
                                if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
                                    instance = findEntity(nestedEntity, instance.embedded[rel].entities[ent], searchstring);
                                    return instance;
                                }
                            }
                        }
                    }
                }

                // If searchsting is only the relation return entire entities array
                if (searchstring.length === 1) {
                    searchRel = domainInstance.getEntityByPluralName(searchstring.splice(0, 1)[0]).name;

                    // console.log("Ich bin hier");
                    // console.log(searchRel);
                    // check if there are embedded entities, only those need ids
                    for (rel in instance.embedded) {
                        for (var types in instance.embedded[rel].entities) {
                            if (searchRel === instance.embedded[rel].entities[types].type) {
                                var resultSet = [];
                                // sort only types out
                                for (var elements in instance.embedded[rel].entities) {
                                    if (instance.embedded[rel].entities[elements].type === searchRel) {
                                        resultSet.push(instance.embedded[rel].entities[elements]);
                                    }
                                }
                                return resultSet;
                            }
                        }
                    }
                } else {
                    // found id
                    return instance;
                }
                return instance;
            }
            // Copied from Stackoverflow https://stackoverflow.com/questions/39085399/lodash-remove-items-recursively
            function deepOmit(obj, keysToOmit) {
                // ERROR somewhat if Meta Data does not exist. Fix that ..

                if (obj instanceof Array) {
                    var OmitArray = [];
                    obj.forEach(function(object) {
                        OmitArray.push(deepOmit(object, keysToOmit));
                    });
                    return OmitArray;
                }
                /*
  var keysToOmitIndex =  _.keyBy(Array.isArray(keysToOmit) ? keysToOmit : [keysToOmit] ); // create an index object of the keys that should be omitted

  function omitFromObject(obj) { // the inner function which will be called recursivley
    return _.transform(obj, function(result, value, key) { // transform to a new object
      if (key in keysToOmitIndex) { // if the key is in the index skip it
        return;
      }

      result[key] = _.isObject(value) ? omitFromObject(value) : value; // if the key is an object run it through the inner function - omitFromObject
  })} */

                return _.omit(obj, keysToOmit); // return the inner function result
            }

            function rebuildPath(obj, pathvariable) {
                // "Relationship:Overview.Entity:59ba8a0d3720861754684b20.Basic:Heading"
                if (typeof (obj["id"]) !== 'undefined') {
                    obj["path"] = pathvariable + "/" + obj["id"];
                } else {
                    obj["path"] = pathvariable + "/" + obj["_id"];
                }
                var priorpath = obj["path"];

                Object.keys(obj).forEach(function(key) {
                    var val = obj[key];

                    if (typeof (val) === "object" && val !== null && val.length > 0) {
                        // foreach Relationship;
                        Object.keys(val).forEach(function(innerkey) {
                            var relationship = val[innerkey];

                            // if its an embedded entity and not a relationship
                            // If its a Relationship
                            if (typeof (relationship.parentRelnName) !== "undefined") {
                                // if relationship has own entities -> Recursion.
                                if (relationship.entities.length > 0) {
                                    var temppath = priorpath;

                                    Object.keys(relationship.entities).forEach(function(innerkey2) {
                                        priorpath = priorpath + "/" + relationship.parentRelnName;
                                        rebuildPath(relationship.entities[innerkey2], priorpath);
                                        priorpath = temppath;
                                    });
                                }
                            }
                        });
                    } else {
                        switch (key) {
                            case "parentBaseClassID":
                                delete obj[key];
                                break;
                        }
                    }
                });

                return obj;
            }
            function addAssocData(EmptyAssocObj, persistence) {
                // if asked for array -> do it for all the elements.

                if (EmptyAssocObj instanceof Array) {
                    var cleanResultsArray = [];
                    EmptyAssocObj.forEach(function(object) {
                        cleanResultsArray.push(addAssocData(object, persistence));
                    });
                    return Promise.all(cleanResultsArray);
                } else {
                    var promises = [];
                    var innerPath = [];
                    var counter = 0;

                    if (typeof (EmptyAssocObj.associations) !== 'undefined') {
                        if (EmptyAssocObj.embedded.length > 0) {
                            for (var rel in EmptyAssocObj.embedded) {
                                if (EmptyAssocObj.embedded[rel].entities.length > 0) {
                                    for (var ent in EmptyAssocObj.embedded[rel].entities) {
                                        if (typeof (EmptyAssocObj.embedded[rel].entities[ent]) !== 'undefined') {
                                            if (typeof (EmptyAssocObj.embedded[rel].entities[ent].associations) !== 'undefined') {
                                                addAssocData(EmptyAssocObj.embedded[rel].entities[ent], persistence);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        EmptyAssocObj.associations.forEach(function(assoc, indexAssoc) {
                            assoc.data.forEach(function(innerAssoc, indexInnerAssoc) {
                                var assocEntity = domainInstance.getEntityByName(innerAssoc.type);
                                var value = assocEntity.getInstance(persistence, innerAssoc["_id"]);

                                promises.push(value);
                                innerPath[counter] = [indexAssoc, indexInnerAssoc];
                                counter = counter + 1;
                            });
                        });

                        return Promise.all(promises).then(values => {
                            for (var i = 0; i < counter; i++) {
                                EmptyAssocObj.associations[innerPath[i][0]].data[innerPath[i][1]].assocData = values[i];
                            }
                            return Promise.resolve(EmptyAssocObj);
                        });
                    } else {
                        return Promise.resolve(EmptyAssocObj);
                    }
                }
            }
        });
};
