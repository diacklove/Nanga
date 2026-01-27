NEWSCHEMA('Transactions', function(schema) {


	// List transactions
	schema.action('query', {
		name: 'List Transactions',
		query: 'search:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'transactions')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var builder = db.find('tbl_transaction');

			$.query.search && builder.search('reference', $.query.search);
			builder.sort('dttransaction', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Read transaction
	schema.action('read', {
		name: 'Read Transaction',
		params: '*id:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'transactions')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var item = await db.read('tbl_transaction').where('id', $.params.id).promise();

			if (!item) {
				$.invalid('@(Transaction not found)');
				return;
			}

			$.callback(item);
		}
	});

	// Create transaction (Ingest)
	schema.action('create', {
		name: 'Ingest Transaction',
		input: 'terminalid:String,reference:String,currency:String,channel:String,country:String,city:String,cardhash:String,status:String,amount:Number,dttransaction:Date',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'transactions')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			model.id = UID();
			model.dtcreated = NOW;

			await db.insert('tbl_transaction', model).promise();

			// Optional: Trigger async analysis here if we were doing it in real-time,
			// but spec says "backend does not perform ML".
			// So we just store it.

			$.success(model.id);
		}
	});
});
