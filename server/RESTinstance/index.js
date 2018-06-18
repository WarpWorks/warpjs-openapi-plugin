const deleteMethod = require('./delete');
const get = require('./get');
const patch = require('./patch');
const post = require('./post');
const put = require('./put');
module.exports = {
    delete: deleteMethod,
    get,
    patch,
    post,
    put
};
