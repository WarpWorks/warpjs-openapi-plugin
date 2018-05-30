const packageJson = require('./../../package.json');

module.exports = {
    assets: {
        src: [
            'assets'
        ]
    },
    test: {
        src: [
            'reports'
        ]
    },
    pack: {
        src: [
            `${packageJson.name.replace('@', '').replace('/', '-')}-*.tgz`
        ]
    }
};
