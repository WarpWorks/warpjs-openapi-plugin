module.exports = {
    default: {
        options: {
            compress: true
        },
        files: [{
            dest: 'assets/style.min.css',
            src: 'client/style.less'
        }]
    }
};
