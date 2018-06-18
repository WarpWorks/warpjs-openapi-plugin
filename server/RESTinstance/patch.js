const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');

const utils = require('./../utils');
const logger = require('./../loggers');
const serverUtils = require('@warp-works/warpjs/lib/utils');

function updateDocument(persistence, entity, instance, searchstring, req, res, type, id) {
    const payload = req.body;
    const updateKey = payload.key;
    const updateValue = payload.value;
    const oldValue = instance;
    var cleanInstance;
    // Certification:59ccff916d607318d81fd063.Overview:59ccff916d607318d81fd064.Images:59ccff916d607318d81fd065.Map:59ccff916d607318d81fd066"

    return Promise.resolve()

        .then(function() {
            cleanInstance = patchNewValue(searchstring, instance, updateKey, updateValue);
            return Promise.resolve();
        })
        .then(() => entity.updateDocument(persistence, cleanInstance))
        .then(() => logger(req, `${req.domain}/${type}/${id}`, {
            updatePath: payload.path,
            newValue: cleanInstance,
            oldValue
        }))
        .then(() => utils.sendJSON(req, res, cleanInstance));
}

module.exports = (req, res) => {
    var params = req.params[0].split("/");
    const domain = params.splice(0, 1)[0];
    const relationship = params.splice(0, 1)[0];
    const id = params.splice(0, 1)[0];

    const domainInstance = serverUtils.getDomain(domain);

    const parent = domainInstance.getParentEntityByRelationshipName(relationship);
    const relationshipEntity = parent.getRelationshipByName(relationship);
    const entity = relationshipEntity.getTargetEntity();
    const type = entity.name;

    // FIXME: What happens for a password? The password should not be managed
    // with the "content" side of things, and should not, be using this
    // end-point.
    logger(req, "Trying to patch", req.body);

    const persistence = serverUtils.getPersistence(domain);
    return Promise.resolve()
        .then(() => entity.getInstance(persistence, id))
        .then(
            (instance) => updateDocument(persistence, entity, instance, params, req, res, type, id),
            () => serverUtils.documentDoesNotExist(req, res)
        )
        .catch((err) => {
            logger(req, "Invalid ID supplied", {err});
            const resource = warpjsUtils.createResource(req, {
                domain,
                type,
                id,
                body: req.body,
                message: err.message
            });
            utils.sendHal(req, res, resource, 400);
        })
        .finally(() => persistence.close());
};

function patchNewValue(searchstring, instance, updateKey, updateValue) {
    if (searchstring.length > 0) {
        var searchRel = searchstring.splice(0, 1)[0];
        var searchID = searchstring.splice(0, 1)[0];

        // check if there are embedded entities, only those need ids
        for (var rel in instance.embedded) {
            if (searchRel === instance.embedded[rel].parentRelnName) {
                for (var ent in instance.embedded[rel].entities) {
                    if (instance.embedded[rel].entities[ent]["_id"].toString() === searchID) {
                        searchstring.shift();
                        instance.embedded[rel].entities[ent] = patchNewValue(searchstring, instance.embedded[rel].entities[ent], updateKey, updateValue);
                        return instance;
                    }
                }
            }
        }
    } else {
        instance[updateKey] = updateValue;
    }
    return instance;
}
