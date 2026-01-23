NEWSCHEMA('Alerts', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('transactionid', 'String(50)');
	schema.define('userid', 'String(50)');
	schema.define('level', 'String(20)');
	schema.define('reason', 'String(200)');
	schema.define('status', 'String(20)');

	// List alerts
	schema.action('query', {
		name: 'List Alerts',
		query: 'search:String',
		action: async function($) {
			var db = DB();
			// Use view if preferring active only, but usually admin wants all.
			// Spec says "store alerts... keep historical trace".
			var builder = db.find('tbl_alert');

			$.query.search && builder.search('reason,level', $.query.search);
			builder.sort('dtcreated', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Read alert
	schema.action('read', {
		name: 'Read Alert',
		params: '*id:String',
		action: async function($) {
			var db = DB();
			var item = await db.read('tbl_alert').where('id', $.params.id).promise();

			if (!item) {
				$.invalid('@(Alert not found)');
				return;
			}

			$.callback(item);
		}
	});

	// Resolve alert
	schema.action('resolve', {
		name: 'Resolve Alert',
		params: '*id:String',
		input: 'status:String', // 'resolved', 'false_positive'
		action: async function($, model) {
			
			// "resolution requires proper role"
			if (!$.user.sa && $.user.role !== 'administrator' && $.user.role !== 'analyst') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var item = await db.read('tbl_alert').where('id', $.params.id).promise();
            if (!item) {
                $.invalid('@(Alert not found)');
                return;
            }

			await db.update('tbl_alert', { status: model.status, userid: $.user.id }).where('id', $.params.id).promise();
			
			audit($, 'resolve', $.params.id, 'Alert resolved: ' + model.status);

			$.success();
		}
	});

	function audit($, action, resource, result) {
		var db = DB();
		db.insert('tbl_audit_log', {
			id: UID(),
			userid: $.user.id,
			action: action,
			resource: resource,
			ipaddress: $.ip,
			result: result,
			dtcreated: NOW
		});
	}

});
