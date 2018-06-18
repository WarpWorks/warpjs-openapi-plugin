const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');
const utils = require('./../utils');
const logger = require('./../loggers');
const serverUtils = require('@warp-works/warpjs/lib/utils');
var domainInstance = {};
var path;
var cleanInstance;
module.exports = (req, res) => {
    path = [];
    var params = req.params[0].split("/");
    var domain = params.splice(0, 1)[0];
    domainInstance = serverUtils.getDomain(domain);

    const pluralName = params.splice(0, 1)[0];
    const targetEntity = domainInstance.getEntityByPluralName(pluralName);
    const type = targetEntity.name;
    const id = params.splice(0, 1)[0];
    // FIXME: What happens for a password? The password should not be managed
    // with the "content" side of things, and should not, be using this
    // end-point.
    logger(req, "Trying to patch", req.body);

    const persistence = serverUtils.getPersistence(domain);
    const entity = serverUtils.getEntity(domain, type);
    return Promise.resolve()
        .then(() => entity.getInstance(persistence, id))
        .then(
            (instance) => updateEntity(persistence, entity, instance, params, req, res, type, id),
            () => serverUtils.documentDoesNotExist(req, res)
        )
        .catch((err) => {
            logger(req, "Failed put/update", {err});
            const resource = warpjsUtils.createResource(req, {
                domain,
                type,
                id,
                body: req.body,
                message: err.message
            });
            utils.sendHal(req, res, resource, 500);
        })
        .finally(() => persistence.close());

    function updateEntity(persistence, entity, instance, searchstring, req, res, type, id) {
        const payload = req.body;
        const oldValue = instance;
        payload["_id"] = id;

        // Certification:59ccff916d607318d81fd063.Overview:59ccff916d607318d81fd064.Images:59ccff916d607318d81fd065.Map:59ccff916d607318d81fd066"

        return Promise.resolve()

            .then(function() {
                cleanInstance = UpdateNewValue(searchstring, instance, payload);

                if (path.length > 1) {
                    path = path.join(".");
                } else {
                    path = path[0];
                }

                return Promise.resolve();
            })
            .then(() => entity.updateSetDocument(persistence, payload, path))
            .then(() => logger(req, `${req.domain}/${type}/${id}`, {
                updatePath: payload.path,
                newValue: cleanInstance,
                oldValue
            }))
            .then(() => removeMeta(cleanInstance))
            .then((cleanedInstance) => utils.sendJSON(req, res, cleanedInstance));
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

    function UpdateNewValue(searchstring, instance, payload) {
        if (searchstring.length > 1) {
            var nestedPluralName = searchstring.splice(0, 1)[0];
            var nestedEntity = domainInstance.getEntityByPluralName(nestedPluralName);
            var entityofInstance = domainInstance.getEntityByName(instance.type);
            var searchRel = entityofInstance.getRelationshipByChildName(nestedEntity.name).name;
            var searchID = searchstring.splice(0, 1)[0];

            // check if there are embedded entities, only those need ids
            for (var rel in instance.embedded) {
                if (searchRel === instance.embedded[rel].parentRelnName) {
                    for (var ent in instance.embedded[rel].entities) {
                        if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
                            path.push("embedded", rel, "entities", ent);
                            instance.embedded[rel].entities[ent] = UpdateNewValue(searchstring, instance.embedded[rel].entities[ent], payload);

                            return instance;
                        }
                    }
                }
            }
        } else {
            Object.keys(payload).forEach(function(key) {
                instance[key] = payload[key];
            });
        }
        return instance;
    }
};
