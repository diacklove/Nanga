NEWSCHEMA('Fraud', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('transactionid', 'String(50)', true);
	schema.define('model', 'String(50)');
	schema.define('decision', 'String(50)');
	schema.define('riskscore', 'Number');

	// List scores
	schema.action('query', {
		name: 'List Fraud Scores',
		query: 'search:String',
		action: async function($) {
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
			
			var db = DB();
			model.id = UID();
			model.dtanalysed = NOW;

			await db.insert('tbl_fraud_score', model).promise();
			
			// DB Trigger 'trg_fraud_alert' will handle alert creation if riskscore >= 70
			
			$.success();
		}
	});
});
