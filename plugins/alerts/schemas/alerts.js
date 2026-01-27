NEWSCHEMA('Alerts', function(schema) {


	// List alerts
	schema.action('query', {
		name: 'List Alerts',
		query: 'search:String',
		action: async function($) {
			var db = DB();
			var builder = db.find('view_alerts_ui');

			$.query.search && builder.search('rule,severity,owner,reference', $.query.search);
			builder.sort('timestamp', true);

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
			if (!global.hasPermission($.user, 'alerts')) {
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
