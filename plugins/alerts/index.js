exports.icon = 'ti ti-bell';
exports.name = '@(Alerts)';
exports.position = 50;
exports.permissions = [{ id: 'alerts', name: 'Alerts' }];
exports.visible = user => user.sa || user.permissions.includes('alerts');

exports.install = function() {
	ROUTE('+API    /api/    -alerts               --> Alerts/query');
	ROUTE('+API    /api/    -alerts_read/{id}     --> Alerts/read');
	ROUTE('+API    /api/    +alerts_resolve/{id}  --> Alerts/resolve');
};
