const Promise = require('bluebird');
const utils = require('./../utils');
const logger = require('./../loggers');
const warpjsUtils = require('@warp-works/warpjs-utils');

module.exports = (req, res) => {
    var params = req.params[0].split("/");
    const domain = params.splice(0, 1)[0];
    const pluralName = params.splice(0, 1)[0];
    const id = params.splice(0, 1)[0];

    var domainInstance;
    Promise.resolve(warpjsUtils.getDomain(domain))
        .then((domainResolved) => {
            domainInstance = domainResolved;
            const entity = domainInstance.getEntityByPluralName(pluralName);
            const type = entity.name;
            var persistence;

            if (params.length > 0) {
                var oldValue;
                var deletedInstance;
                return Promise.resolve(warpjsUtils.getPersistence(domain))
                    .then((persistence) => entity.getInstance(persistence, id))
                    .then(
                        (instance) => {
                            return Promise.resolve()
                                .then(() => {
                                    oldValue = instance;
                                    deletedInstance = deleteEmbedded(params, instance);
                                    return Promise.resolve(warpjsUtils.getPersistence(domain));
                                })
                                .then((persistenceResolved) => {
                                    persistence = persistenceResolved;
                                    persistence.update(type, deletedInstance);
                                })
                                .then(() => logger(req, `${req.domain}/${type}/${id}`, {
                                    newValue: deletedInstance,
                                    oldValue
                                }))
                                .then(() => utils.sendJSON(req, res, deletedInstance))
                                .finally(() => persistence.close());
                        });
            } else {
                logger(req, "Trying to delete");
                console.log(`Request to delete ${domain}/${type}/${id}`);
                return Promise.resolve(warpjsUtils.getPersistence(domain))
                    .then((persistenceResolved) => {
                        persistence = persistenceResolved;
                        persistence.remove(type, id);
                    })
                    .then(() => res.status(204).send())
                    .finally(() => persistence.close())
                    .catch((err) => {
                        logger(req, "Failed", {err});
                        warpjsUtils.documentDoesNotExist(req, res);
                    });
            }

            function deleteEmbedded(searchstring, instance) {
                if (searchstring.length > 2) {
                    var instanceEntity = domainInstance.getEntityByName(instance.type);
                    var child = domain.getEntityByPluralName(searchstring.splice(0, 1)[0]);
                    var newRelationship = instanceEntity.getRelationshipByChildName(child.name);
                    var searchRel = newRelationship.name;
                    var searchID = searchstring.splice(0, 1)[0];
                    // find the embedded ID
                    for (var rel in instance.embedded) {
                        if (searchRel === instance.embedded[rel].parentRelnName) {
                            for (var ent in instance.embedded[rel].entities) {
                                if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
                                    instance.embedded[rel].entities[ent] = deleteEmbedded(searchstring, instance.embedded[rel].entities[ent]);
                                    return instance;
                                }
                            }
                        }
                    }
                } else {
                    for (rel in instance.embedded) {
                        // Remove the entity from the relation
                        for (ent in instance.embedded[rel].entities) {
                            if (instance.embedded[rel].entities[ent]["_id"].toString() === searchstring[1]) {
                                instance.embedded[rel].entities.splice(ent, 1);
                            }
                        }
                    }
                }
                return instance;
            }
        });
};
