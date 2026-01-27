exports.install = function() {
    ROUTE('+GET    /', index);

    // rewrite error pages to json responses
    ROUTE('#400', ($) => jsonError($, 400));
    ROUTE('#401', ($) => jsonError($, 401));
    ROUTE('#403', ($) => jsonError($, 403));
    ROUTE('#404', ($) => jsonError($, 404));
    ROUTE('#408', ($) => jsonError($, 408));
    ROUTE('#500', ($) => jsonError($, 500));

}   

function index($) {
    $.plain('Nanga is running...');
}


function jsonError($, status) {
    let message = 'Unknown error';
    switch (status) {
        case 400:
            message = 'Bad Request';
            break;  
        case 401:
            message = 'Unauthorized';
            break;  
        case 403:
            message = 'Forbidden';
            break;
        case 404:
            message = 'Not Found';
            break;  
        case 408:
            message = 'Request Timeout';
            break;
        case 500:
            message = 'Internal Server Error';
            break;  
    }   
    $.json({ error: message, status: status }, status);
}       
