const warpjsUtils = require('@warp-works/warpjs-utils');
const template = require('./template.hbs');

(($) => $(document).ready(() => warpjsUtils.getCurrentPageHAL($)
    .then((result) => {
        //        var htmlcontent = {body: result.data.swagger};
        console.log(result.data.openApi);
        const content = template({body: result.data.openApi});

        $(warpjsUtils.constants.CONTENT_PLACEHOLDER).html(content);
        warpjsUtils.documentReady($);

        // someonclick function
        /* $(warpjsUtils.constants.CONTENT_PLACEHOLDER).on('click', '.search-box [data-warpjs-action="search"]', function(e) {
            $(this).closest('form').submit();
        }); */
    })
))(jQuery);
