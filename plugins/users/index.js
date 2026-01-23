exports.icon = 'ti ti-users';
exports.name = '@(Users)';
exports.position = 10;
exports.permissions = [{ id: 'users', name: 'Users' }];
exports.visible = user => user.sa || user.permissions.includes('users');

exports.install = function() {
	ROUTE('+API    /api/    -users               --> Users/query');
	ROUTE('+API    /api/    -users_read/{id}     --> Users/read');
	ROUTE('+API    /api/    +users_create        --> Users/create');
	ROUTE('+API    /api/    +users_update/{id}   --> Users/update');
	ROUTE('+API    /api/    +users_remove/{id}   --> Users/remove');
};
