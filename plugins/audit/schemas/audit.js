NEWSCHEMA('Audit', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('userid', 'String(50)');
	schema.define('action', 'String(100)');
	schema.define('resource', 'String(100)');
	schema.define('result', 'String(200)');
	schema.define('ipaddress', 'String(50)');
	schema.define('dtcreated', 'Date');

	// List audit logs
	schema.action('query', {
		name: 'List Audit Logs',
		query: 'search:String',
		action: async function($) {
			// "support investigation... central to PCI DSS"
			// Only auditor or admin
			if (!$.user.sa && $.user.role !== 'administrator' && $.user.role !== 'auditor') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var builder = db.find('tbl_audit_log');

			$.query.search && builder.search('action,resource,userid', $.query.search);
			builder.sort('dtcreated', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

});
