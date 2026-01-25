NEWSCHEMA('PCI', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('name', 'String(100)');
	schema.define('zone', 'String(50)');
	schema.define('description', 'String(200)');
	schema.define('isinscope', 'Boolean');

	// List Scope
	schema.action('scope', {
		name: 'List PCI Scope',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}
			var db = DB();
			var response = await db.find('tbl_pci_scope').sort('zone').promise();
			$.callback(response);
		}
	});

	// List Controls
	schema.action('controls', {
		name: 'List Security Controls',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}
			var db = DB();
			var response = await db.find('tbl_security_control').sort('type').promise();
			$.callback(response);
		}
	});

	// Dashboard Stats
	schema.action('dashboard', {
		name: 'PCI Dashboard',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}
			var db = DB();
			var response = await db.find('view_pci_compliance').promise();
			$.callback(response);
		}
	});

	// Update Scope (Admin only)
	schema.action('scope_update', {
		name: 'Update PCI Scope',
		params: '*id:String',
		input: 'isinscope:Boolean,description:String',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			await db.update('tbl_pci_scope', model).where('id', $.params.id).promise();
			
			audit($, 'update', $.params.id, 'PCI Scope updated');
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
