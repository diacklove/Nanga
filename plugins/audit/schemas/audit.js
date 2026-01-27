NEWSCHEMA('Audit', function(schema) {


	// List audit logs
	schema.action('query', {
		name: 'List Audit Logs',
		query: 'search:String',
		action: async function($) {
			// "support investigation... central to PCI DSS"
			// Only auditor or admin
			
			if (!global.hasPermission($.user, 'audit')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var builder = db.find('view_audit_ui');

			$.query.search && builder.search('actor,action,target', $.query.search);
			builder.sort('time', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

});
