exports.icon = 'ti ti-credit-card';
exports.name = '@(Transactions)';
exports.position = 30;
exports.permissions = [{ id: 'transactions', name: 'Transactions' }];
exports.visible = user => user.sa || user.permissions.includes('transactions');

exports.install = function() {
	ROUTE('+API    /api/    -transactions               --> Transactions/query');
	ROUTE('+API    /api/    -transactions_read/{id}     --> Transactions/read');
	ROUTE('+API    /api/    +transactions_create        --> Transactions/create');
};
