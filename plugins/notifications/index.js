exports.id = 'notification';
exports.name = 'Notification';
exports.position = 8;
exports.permissions = [{ id: 'notification', name: 'Notification' }];
exports.visible = user => user.sa || user.permissions.includes('notification');

exports.install = function() {
    ROUTE('+API    /api/    -notifications                 --> Notifications/list');
    ROUTE('+API    /api/    +notifications_list            --> Notifications/listing');
    ROUTE('+API    /api/    -notifications_read/{id}       --> Notifications/read');
    ROUTE('+API    /api/    -notifications_mark_read/{id}       --> Notifications/mark_read');
    ROUTE('+API    /api/    -notifications_all_read      --> Notifications/all_read');
    ROUTE('+API    /api/    -notifications_open            --> Notifications/open');
    ROUTE('+API    /api/    -notifications_remove/{id}     --> Notifications/remove');
    ROUTE('+API    /api/    -notifications_clear           --> Notifications/clear');
};