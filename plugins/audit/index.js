exports.icon = 'ti ti-history';
exports.name = '@(Audit)';
exports.position = 60;
exports.permissions = [{ id: 'audit', name: 'Audit' }];
exports.visible = user => user.sa || user.permissions.includes('audit');

exports.install = function() {
	ROUTE('+API    /api/    -audit               --> Audit/query');
};
