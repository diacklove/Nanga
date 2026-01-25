AUTH(function($) {
	var token = $.headers['x-token'] || $.headers['X-Token'];
	if (!token) {
		$.invalid(401);
		return;
	}

	var db = DB();

	var resolveUser = async function(session) {
		if (!session || !session.userid) {
			$.invalid(401);
			return;
		}

		var user = await db.read('tbl_user').where('id', session.userid).promise();
		if (!user) {
			$.invalid(401);
			return;
		}

		user.sa = user.role === 'administrator' || user.role === 'admin' || user.sa;
		user.permissions = global.getPermissionKeys
			? global.getPermissionKeys(user.role)
			: [];

		$.success(user);
	};

	// Try in-memory sessions first
	if (MAIN.sessions) {
		for (var key in MAIN.sessions) {
			if (MAIN.sessions[key].token === token) {
				resolveUser(MAIN.sessions[key]);
				return;
			}
		}
	}

	// Fallback to database
	db.read('tbl_session')
		.where('token', token)
		.promise()
		.then(resolveUser)
		.catch(function() {
			$.invalid(401);
		});
});
