NEWSCHEMA('Users', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('name', 'String(100)', true);
	schema.define('email', 'Email', true);
	schema.define('phone', 'Phone');
	schema.define('role', 'String(50)', true);
	schema.define('status', 'String(20)');
	schema.define('password', 'String(100)');

	// List users
	schema.action('query', {
		name: 'List Users',
		query: 'search:String',
		action: async function($) {
			if (!$.user.sa && $.user.role !== 'administrator') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var builder = db.find('tbl_user');

			builder.fields('id,name,email,role,status,dtcreated,dtlastlogin');
			$.query.search && builder.search('name,email', $.query.search);
			builder.sort('dtcreated', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Read user
	schema.action('read', {
		name: 'Read User',
		params: '*id:String',
		action: async function($) {
			if (!$.user.sa && $.user.role !== 'administrator') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var user = await db.read('tbl_user').fields('id,name,email,phone,role,status,dtcreated,dtlastlogin').where('id', $.params.id).promise();

			if (!user) {
				$.invalid('@(User not found)');
				return;
			}

			$.callback(user);
		}
	});

	// Create user
	schema.action('create', {
		name: 'Create User',
		input: 'name:String,email:Email,phone:Phone,role:String,password:String',
		action: async function($, model) {
			if (!$.user.sa && $.user.role !== 'administrator') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var exists = await db.read('tbl_user').where('email', model.email).promise();

			if (exists) {
				$.invalid('@(User with that email already exists)');
				return;
			}

			model.id = UID();
			model.dtcreated = NOW;
			model.status = 'active';
			model.password = model.password.sha256(CONF.passwordizator);

			await db.insert('tbl_user', model).promise();

			// Audit
			audit($, 'create', model.id, 'User created');

			$.success();
		}
	});

	// Update user
	schema.action('update', {
		name: 'Update User',
		params: '*id:String',
		input: 'name:String,email:Email,phone:Phone,role:String,status:String,password:String',
		action: async function($, model) {
			if (!$.user.sa && $.user.role !== 'administrator') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var user = await db.read('tbl_user').where('id', $.params.id).promise();

			if (!user) {
				$.invalid('@(User not found)');
				return;
			}

			if (model.password && model.password.length > 0)
				model.password = model.password.sha256(CONF.passwordizator);
			else
				delete model.password;

			await db.update('tbl_user', model).where('id', $.params.id).promise();

			// Audit
			audit($, 'update', $.params.id, 'User updated');

			$.success();
		}
	});

	// Remove user (Logical delete usually, but spec says "enable/disable". Let's assume remove is disable or actual delete.
	// Spec says: "enable/disable accounts". I'll use status update for disable.
	// But standard "remove" action is often expected. I'll implement remove as 'status=deleted' or actual delete if compliant.
	// Looking at schema: no 'isremoved' field. `status` field exists.
	// I will implement 'remove' as setting status to 'disabled' or DELETE.
	// "Logical deletions preferred" -> Spec point 7.
	// So I will update status to 'disabled' or 'deleted'. Let's use 'deleted' or just rely on Update for status change?
	// I'll provide a helper remove that sets status to 'deleted'.

	schema.action('remove', {
		name: 'Remove User',
		params: '*id:String',
		action: async function($) {
			if (!$.user.sa && $.user.role !== 'administrator') {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			await db.update('tbl_user', { status: 'deleted' }).where('id', $.params.id).promise();

			// Audit
			audit($, 'delete', $.params.id, 'User deleted (logical)');

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
