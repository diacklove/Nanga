NEWSCHEMA('Terminals', function(schema) {


	// List terminals
	schema.action('query', {
		name: 'List Terminals',
		query: 'search:String',
		action: async function($) {
			var db = DB();
			var builder = db.find('tbl_terminal');

			$.query.search && builder.search('name,city', $.query.search);
			builder.sort('dtcreated', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Read terminal
	schema.action('read', {
		name: 'Read Terminal',
		params: '*id:String',
		action: async function($) {
			var db = DB();
			var item = await db.read('tbl_terminal').where('id', $.params.id).promise();

			if (!item) {
				$.invalid('@(Terminal not found)');
				return;
			}

			$.callback(item);
		}
	});

	// Create terminal
	schema.action('create', {
		name: 'Create Terminal',
		input: 'name:String,type:String,country:String,city:String,latitude:Number,longitude:Number',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'terminals')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			model.id = UID();
			model.dtcreated = NOW;
			model.isactive = true;

			await db.insert('tbl_terminal', model).promise();
			audit($, 'create', model.id, 'Terminal created');
			$.success();
		}
	});

	// Update terminal
	schema.action('update', {
		name: 'Update Terminal',
		params: '*id:String',
		input: 'name:String,type:String,country:String,city:String,latitude:Number,longitude:Number,isactive:Boolean',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'terminals')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			await db.update('tbl_terminal', model).where('id', $.params.id).promise();
			audit($, 'update', $.params.id, 'Terminal updated');
			$.success();
		}
	});

	// Remove terminal
	schema.action('remove', {
		name: 'Remove Terminal',
		params: '*id:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'terminals')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			await db.update('tbl_terminal', { isactive: false }).where('id', $.params.id).promise();
			audit($, 'delete', $.params.id, 'Terminal deactivated');
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
