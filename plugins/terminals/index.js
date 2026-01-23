exports.icon = 'ti ti-desktop';
exports.name = '@(Terminals)';
exports.position = 20;
exports.permissions = [{ id: 'terminals', name: 'Terminals' }];
exports.visible = user => user.sa || user.permissions.includes('terminals');

exports.install = function() {
	ROUTE('+API    /api/    -terminals               --> Terminals/query');
	ROUTE('+API    /api/    -terminals_read/{id}     --> Terminals/read');
	ROUTE('+API    /api/    +terminals_create        --> Terminals/create');
	ROUTE('+API    /api/    +terminals_update/{id}   --> Terminals/update');
	ROUTE('+API    /api/    +terminals_remove/{id}   --> Terminals/remove');
};
