exports.icon = 'ti ti-shield-check';
exports.name = '@(Fraud Analysis)';
exports.position = 40;
exports.permissions = [{ id: 'fraud', name: 'Fraud' }];
exports.visible = user => user.sa || user.permissions.includes('fraud');

exports.install = function() {
	ROUTE('+API    /api/    -fraud_scores               --> Fraud/query');
	ROUTE('+API    /api/    +fraud_scores_create        --> Fraud/create');
	ROUTE('+API    /api/    -fraud_service_health       --> Fraud/health');
	ROUTE('+API    /api/    +fraud_service_dataset      --> Fraud/dataset_register');
	ROUTE('+API    /api/    -fraud_service_dataset/{id} --> Fraud/dataset_read');
	ROUTE('+API    /api/    +fraud_service_training     --> Fraud/training_create');
	ROUTE('+API    /api/    -fraud_service_training/{id}--> Fraud/training_read');
	ROUTE('+API    /api/    +fraud_service_model        --> Fraud/model_register');
	ROUTE('+API    /api/    +fraud_service_activate/{id}--> Fraud/model_activate');
	ROUTE('+API    /api/    -fraud_service_active       --> Fraud/model_active');
	ROUTE('+API    /api/    +fraud_service_inference    --> Fraud/inference');
	ROUTE('+API    /api/    +fraud_service_infer_store   --> Fraud/inference_persist');
	ROUTE('+API    /api/    +fraud_service_pipeline     --> Fraud/pipeline_run');
};
