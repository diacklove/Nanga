exports.icon = 'ti ti-user';
exports.name = '@(Account)';
exports.position = 2;
exports.permissions = [{ id: 'account', name: 'Account' }];
exports.visible = user => user.sa || user.permissions.includes('account');

exports.install = function() {
	CORS();
	// API
	ROUTE('+API    /api/    -account                             --> Account/profile');
	ROUTE('+API    /api/    -account_list                             --> Account/list');
	ROUTE('-API    /api/    +account_create                      --> Account/create');
	ROUTE('-API    /api/    +account_login                       --> Account/login');
	ROUTE('+API    /api/    +account_logout                      --> Account/logout');
	ROUTE('+API    /api/    +account_reset                       --> Account/reset');
	ROUTE('+API    /api/    +account_verify                      --> Account/verify');
	ROUTE('+API    /api/    +account_update                      --> Account/update');
	ROUTE('+API    /api/    +account_password                    --> Account/password');
	ROUTE('+API    /api/    -account_notifications               --> *Customers/notifications');
	ROUTE('+API    /api/    -account_notifications_read/{id}     --> *Customers/notifications_read');

	ROUTE('API    /api/    +account_oauth                      --> *Account/oauth');
	ROUTE('API    /api/    +account_google                      --> *Account/google');
	ROUTE('API    /api/    +account_github                      --> *Account/github');
};

