NEWSCHEMA('Account/Notifications', function(schema) {
	schema.action('list', {
		name: 'List customer notifications',
		query: 'search:String,unseen:Boolean,starred:Boolean,type:String',
		action: async function($) {
			var builder = DB().find('tbl_notification');
			var query = $.query;
			builder.fields('id,type,title,message,userid,isdelivery,isread,isadmin,schema,dtread,color,priority,icon,dtcreated');
			builder.where('userid', $.user.id);
			builder.where('isdelivery', false);
			builder.where('isadmin', false);

			if (query.search)
				builder.search('search', query.search);

			if (query.unseen)
				builder.where('isread', false);

			if (query.starred)
				builder.where('isstarred', true);

			if (query.type)
				builder.where('type', query.type);

			builder.limit(100);
			builder.callback($.callback);
		}
	});

	schema.action('usernotifications', {
		name: 'List customer notifications',
		query: 'search:String,unseen:Boolean,starred:Boolean,type:String',
		params: '*id:UID',
		action: async function($) {
			$.user = { id: $.params.id, sa: false };
			var builder = DB().find('tbl_notification');
			var query = $.query;
			builder.fields('id,type,title,message,userid,isdelivery,isread,isadmin,schema,dtread,color,priority,icon,dtcreated');
			builder.where('userid', $.user.id);
			builder.where('isdelivery', false);
			builder.where('isadmin', false);

			if (query.search)
				builder.search('search', query.search);

			if (query.unseen)
				builder.where('isread', false);

			if (query.starred)
				builder.where('isstarred', true);

			if (query.type)
				builder.where('type', query.type);

			builder.limit(100);
			builder.callback($.callback);
		}
	});




	schema.action('read', {
		name: 'open notification',
		params: 'id:UID',
		action: async function($) {
			var builder = DB().read('tbl_notification');
			builder.fields('id,type,title,message,userid,isdelivery,isread,isadmin,schema,dtread,color,priority,icon,dtcreated');
			builder.where('userid', $.user.id);
			builder.where('isdelivery', false);
			builder.where('isadmin', false);
			builder.id($.params.id);
			builder.error(404);
			builder.callback(async function(err, data)  {

				if (!data.isread)
					await DB().update('tbl_notification', { isread: true, dtread: NOW }).where('userid', $.user.id).id($.params.id).error(404).promise();

				$.callback(data);
			});

		}
	});

	schema.action('seen', {
		name: 'open notification',
		params: '*id:String',
		action: async function($) {
			var ids = $.params.id.split(',');
			await DB().update('tbl_notification', { isread: true, dtread: NOW }).in('id', ids).promise();
			$.success();
		}
	});
});