NEWSCHEMA('Notifications', function(schema) {
	schema.action('list', {
		name: 'List all notifications',
		query: 'search:String,title:String,isread:Boolean',
		action: async function($) {
			let db = DATA;
			db.autoquery($.query, 'id:String,title:String,isread:Boolean', 'dtcreated_desc', 50);
			$.query.search && db.search('search', $.query.search);
			db.where('userid', $.user.id);
			db.find('tbl_notification').fields('id,title,isread,message').callback(async function(err, response) {
				if (err) {
					$.invalid(err);
					return;
				}
				await db.update('tbl_notification', {isread: true, dtread: NOW }).in('id', response, 'id').promise();
				$.callback(response);
			});
		}
	});

	schema.action('listing', {
		name: 'List all notifications',
		input: '*filter:{all|unread}',
		action: async function($, model) {
			let builder = DATA.find('tbl_notification');
			model.filter == 'unread' && builder.where('isread', false);
			builder.where('userid', $.user.id);
			builder.fields('id,title,type,message, isread as isRead, dtcreated as createdAt').callback(async function(err, response) {
				if (err) {
					$.invalid(err);
					return;
				}
				await DATA.update('tbl_notification', {isread: true, dtread: NOW }).in('id', response, 'id').promise();
				$.callback(response);
			});
		}
	});

	schema.action('read', {
		name: 'Read a specific notification',
		params: '*id:String',
		action: async function($) {
			DATA.read('tbl_notification').id($.params.id).error(404).callback($.callback);
		}
	});


	schema.action('mark_read', {
		name: 'Mark as read a specific notification',
		params: '*id:String',
		action: async function($) {
			DATA.update('tbl_notification', { isread: true, dtread: NOW }).id($.params.id).error(404).callback($);
		}
	});

	schema.action('all_read', {
		name: 'Mark all  notifications as read',
		action: async function($) {
			DATA.update('tbl_notification', { isread: true, dtread: NOW }).where('userid', $.user.id).callback($);
		}
	});

	schema.action('remove', {
		name: 'remove and mark all as read',
		params: '*id:String',
		action: async function($) {
			DATA.remove('tbl_notification').id($.params.id).callback($.done($.params.id));
		}
	});

	schema.action('clear', {
		name: 'Clear all notification of the user',
		action: async function($) {
			DATA.remove('tbl_notification').where('userid', $.user.id).callback($.done());
		}
	});
});