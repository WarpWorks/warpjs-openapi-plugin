const path = require('path');
const winston = require('winston');

const config = require('@warp-works/warpjs/lib/config');

winston.loggers.add('W2:content:instance', {
    console: {
        level: 'info',
        colorize: true
    },
    file: {
        filename: path.join(config.folders.w2projects, 'logs', 'actions.log')
    }
});

module.exports = (req, message, data) => {
    const dataToLog = {
        data,
        req: {
            method: req.method,
            url: req.originalUrl,
            user: req.warpjsUser,
            token: req.warpjsRequestToken
        }
    };
    winston.loggers.get('W2:content:instance').info(message, dataToLog);
};
