exports.icon = 'ti ti-shield-check';
exports.name = '@(Fraud Analysis)';
exports.position = 40;
exports.permissions = [{ id: 'fraud', name: 'Fraud' }];
exports.visible = user => user.sa || user.permissions.includes('fraud');

exports.install = function() {
	ROUTE('+API    /api/    -fraud_scores               --> Fraud/query');
	ROUTE('+API    /api/    +fraud_scores_create        --> Fraud/create');
};
