NEWSCHEMA('Fraud', function(schema) {


	// List scores
	schema.action('query', {
		name: 'List Fraud Scores',
		query: 'search:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'fraud')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var builder = db.find('view_fraud_monitoring'); // Using the view defined in SQL

			$.query.search && builder.search('reference', $.query.search);
			builder.sort('dtanalysed', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Create score (Ingest from Spark)
	schema.action('create', {
		name: 'Ingest Fraud Score',
		input: 'transactionid:String,model:String,decision:String,riskscore:Number',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'fraud')) {
				$.invalid('@(Not authorized)');
				return;
			}
			
			var db = DB();
			model.id = UID();
			model.dtanalysed = NOW;

			await db.insert('tbl_fraud_score', model).promise();
			
			// DB Trigger 'trg_fraud_alert' will handle alert creation if riskscore >= 70
			
			$.success();
		}
	});

	// Fraud service health
	schema.action('health', {
		name: 'Fraud Service Health',
		action: async function($) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'GET', '/health');
		}
	});

	// Dataset lifecycle
	schema.action('dataset_register', {
		name: 'Register Dataset',
		input: 'dataset_id:String,name:String,version:String,source:String,schema_hash:String,features:[String],metadata:Object',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/datasets/register', model);
		}
	});

	schema.action('dataset_read', {
		name: 'Read Dataset',
		params: '*id:String',
		action: async function($) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'GET', '/datasets/' + $.params.id);
		}
	});

	// Training jobs
	schema.action('training_create', {
		name: 'Create Training Job',
		input: 'dataset_id:String,algorithm:String,hyperparameters:Object',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/training/jobs', model);
		}
	});

	schema.action('training_read', {
		name: 'Read Training Job',
		params: '*id:String',
		action: async function($) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'GET', '/training/jobs/' + $.params.id);
		}
	});

	// Models
	schema.action('model_register', {
		name: 'Register Model',
		input: 'job_id:String,dataset_id:String,algorithm:String,metrics:Object,artifact_uri:String',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/models/register', model);
		}
	});

	schema.action('model_activate', {
		name: 'Activate Model',
		params: '*id:String',
		action: async function($) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/models/' + $.params.id + '/activate');
		}
	});

	schema.action('model_active', {
		name: 'Get Active Model',
		action: async function($) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'GET', '/models/active');
		}
	});

	// Inference
	schema.action('inference', {
		name: 'Run Inference',
		input: 'record:Object,records:[Object]',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/inference', model);
		}
	});

	schema.action('inference_persist', {
		name: 'Run Inference and Persist Scores',
		input: 'record:Object,records:[Object]',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;

			var response = await requestService('POST', '/inference', model);
			if (!response || !response.results) {
				$.invalid('@(Service unavailable)');
				return;
			}

			var missing = response.results.find(item => !item.transaction_id);
			if (missing) {
				$.invalid('@(Missing transaction id)');
				return;
			}

			var db = DB();
			var inserted = 0;
			for (var item of response.results) {
				var score = typeof item.score === 'number' ? item.score : 0;
				var riskscore = Math.round(score * 100);
				var decision = riskscore >= 70 ? 'review' : (riskscore >= 40 ? 'monitor' : 'approve');
				await db.insert('tbl_fraud_score', {
					id: UID(),
					transactionid: item.transaction_id,
					model: response.model_id || 'active',
					decision: decision,
					riskscore: riskscore,
					dtanalysed: NOW
				}).promise();
				inserted++;
			}

			$.callback({
				model_id: response.model_id,
				inserted: inserted,
				results: response.results
			});
		}
	});

	// Pipelines
	schema.action('pipeline_run', {
		name: 'Run Spark Pipeline',
		input: 'dataset_id:String,pipeline_name:String,parameters:Object',
		action: async function($, model) {
			if (!ensureFraudAccess($))
				return;
			await forward($, 'POST', '/pipelines/run', model);
		}
	});

	function ensureFraudAccess($) {
		if (global.hasPermission($.user, 'fraud'))
			return true;
		$.invalid('@(Not authorized)');
		return false;
	}

	async function forward($, method, path, payload) {
		var url = getServiceUrl(path);
		try {
			var response = await requestService(method, path, payload);
			$.callback(response);
		} catch (err) {
			$.invalid(err && err.message ? err.message : '@(Service unavailable)');
		}
	}

	function requestService(method, path, payload) {
		var url = getServiceUrl(path);
		var builder = RESTBuilder[method](url);
		builder.timeout(20000);
		if (payload)
			builder.json(payload);
		return builder.promise();
	}

	function getServiceUrl(path) {
		var base = (CONF.fraudservice || 'http://127.0.0.1:8010').replace(/\/$/, '');
		return base + path;
	}
});
