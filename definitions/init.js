FUNC.createtoken = function() {
	return GUID(60);
};

FUNC.login = async function($, userid) {
	var db = DB();
	var session = {};
	session.id = UID();
	session.userid = userid;
	session.dtcreated = NOW;
	session.token = FUNC.createtoken();
	session.ip = $.ip;
	session.ua = $.ua;
	session.expires = NOW.add(CONF.cookie_expires || '7 days');
	session.device = $.ismobile ? 'mobile' : 'desktop';

	MAIN.sessions = MAIN.sessions || {};
	MAIN.sessions[session.id] = session;

	await db.insert('tbl_session', session).promise();
	$.success(session.token);
};
