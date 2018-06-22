const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');
const utils = require('./../utils');
const logger = require('./../loggers');
var domainInstance;
module.exports = (req, res) => {
    var params = req.params[0].split("/");
    var domain = params.splice(0, 1)[0];
    const pluralName = params.splice(0, 1)[0];
    const id = params.splice(0, 1)[0];
    var entity;
    var type;
    var persistence;
    var oldValue;
    var cleanInstance;

    Promise.resolve(warpjsUtils.getDomain(domain))
        .then(domainResolved => {
            // Set Domain;
            domainInstance = domainResolved;

            return domainInstance.getEntityByPluralName(pluralName);
        }
        )
        .then(entityResolved => {
            // FIXME: What happens for a password? The password should not be managed
            // with the "content" side of things, and should not, be using this
            // end-point.
            entity = entityResolved;
            type = entity.name;

            persistence = warpjsUtils.getPersistence(domain);
            return Promise.resolve(persistence);
        })
        .then((persistence) => {
            return [entity.getInstance(persistence, id), persistence];
        })
        .spread((instance, persistence) => {
            const payload = req.body;
            oldValue = instance;
            payload["_id"] = id;
            return [UpdateNewValue(params, instance, payload), persistence];
        })
        .spread((instance, persistence) => {
            cleanInstance = instance;
            return Promise.resolve(persistence.update(type, instance));
        })
        .then(() => removeMeta(cleanInstance))
        .then((cleanedInstance) => {
            utils.sendJSON(req, res, cleanedInstance);
            return cleanedInstance;
        })
        .then((cleanedInstance) => logger(req, `${req.domain}/${type}/${id}`, {
            newValue: cleanedInstance,
            oldValue
        })

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
};

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
        // Delete payload_id for embedded entities.
        delete payload._id;

        // check if there are embedded entities, only those need ids
        for (var rel in instance.embedded) {
            if (searchRel === instance.embedded[rel].parentRelnName) {
                for (var ent in instance.embedded[rel].entities) {
                    if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
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
