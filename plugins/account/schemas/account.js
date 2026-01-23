// create newschema
NEWSCHEMA('Account', function (schema) {
    // CREATE ACTION (not forget password confirm)
    schema.action('create', {
        name: 'Create Account',
        input: '*name:String,email:Email,phone:Phone,password:String',
        action: async function ($, model)  {
            var db = DB();
            // check if user with that email already exists
            var user = await db.read('tbl_user').where('email', model.email).promise();

            // if user exists, throw error
            if (user) {
                $.invalid('@(User with that email already exists)');
                return;
            }

            // if user does not exist, extend model with additional fields
            model.id = UID();
            model.dtcreated = NOW;
            model.role = 'analyst';
            model.token = GUID(60);
            // hash password
            model.password = model.password.sha256(CONF.passwordizator);

            // insert user into database and send email
            await db.insert('tbl_user', model).promise();


            // create session
            var session = {};
            session.id = UID();
            session.userid = model.id;
            session.dtcreated = NOW;
            session.token = ENCRYPTREQ($, { id: session.id }, CONF.salt);
            session.ip = $.ip;
            session.ua = $.ua;
            session.expires = NOW.add(CONF.cookie_expires);
            session.device = $.ismobile ? 'mobile' : 'desktop';

            delete MAIN.sessions[session.id];
            MAIN.sessions[session.id] = session;
            // insert session into database
            await db.insert('tbl_session', session).promise();
            // send session token to client
            $.success(session.token);
            model.email && MAIL(model.email, '@(Confirm account)', '/mail/user-create', model, '');
        }
    });



    // LOGIN ACTION
    schema.action('login', {
        name: 'Login',
        input: '*email:Email,password:Password',
        action: async function ($, model) {
            var db = DB();
            // check if user with that email exists
            var user = await db.read('tbl_user').where('email', model.email).promise();
            // if user does not exist, throw error
            if (!user) {
                $.invalid('@(Invalid Credentials)');
                return;
            }

            // check if password is correct
            if (user.password !== model.password.sha256(CONF.passwordizator)) {
                $.invalid('@(Invalid Credentials)');
                return;
            }

            if (user.status !== 'active') {
                $.invalid('@(Account is disabled)');
                return;
            }

			FUNC.login($, user.id);
        }
    });
    // action logout
    schema.action('logout', {
        name: 'Logout',
        action: async function ($) {
            var db = DB();
            delete MAIN.sessions[$.user.sessionid]; // remove session from memory
            await db.remove('tbl_session').where('id', $.user.sessionid).promise();
            $.success();
        }
    });

    // PROFILE ACTION
    schema.action('profile', {
        name: 'Profile',
        action: async function ($) {
            var user = $.user;
            $.success(user);
        }
    });

    // UPDATE ACTION
    schema.action('update', {
        name: 'Update Profile',
        input: '*name:String,email:Email,phone:Phone,password:Password',
        action: async function ($, model) {
            var db = DB();
            // check if user with that email exists
            var user = await db.read('tbl_user').where('email', model.email).promise();
            // if user does not exist, throw error
            if (user && user.id!== $.user.id) {
                $.invalid('@(Invalid credentials)');
                return;
            }
            // check if password is correct
            if (model.password && model.password!== $.user.password) {
                $.invalid('@(Invalid credentials)');
                return;
            }
            // hash password
            model.password = model.password.sha256(CONF.passwordizator);
            // update user
            await db.update('tbl_user', model).where('id', $.user.id).promise();
            $.success();
        }
    });


    // Password reset
    schema.action('password', {
        name: 'Reset Password',
        input: '*password:Password,confirm:Password',
        action: async function ($, model) {
            var db = DB();
            // check if password is correct
            if (model.password!== model.confirm) {
                $.invalid('@(Passwords do not match)');
                return;
            }
            // hash password
            model.password = model.password.sha256(CONF.passwordizator);
            // update user
            await db.update('tbl_user', model).where('id', $.user.id).promise();
            $.success();
        }
    });

	schema.action('list', {
        name: 'list accounts',
		query: 'search:String',
        action: async function ($, model) {
            var db = DB();
            // check if password is correct
            if (!$.user.sa) {
                $.invalid('@(Not authorized)');
                return;
            }
			let builder = db.find('tbl_user');
			$.query.search && builder.search('name', $.query.search);
            let list = await builder.promise();
            $.callback(list);
        }
    });
    // verify email
    schema.action('verify', {
        name: 'Verify Email',
        input: '*token:String',
        action: async function ($, model) {
            var db = DB();
            // check if user with that email exists
            var user = await db.read('tbl_user').where('token', model.token).promise();
            // if user does not exist, throw error
            if (!user) {
                $.invalid('@(Invalid token)');
                return;
            }
            // update user
            await db.update('tbl_user', { isconfirmed: true, token: null }).where('id', user.id).promise();
            $.success();
        }
    });

    // request password reset
    schema.action('request', {
        name: 'Request Password Reset',
        input: '*email:Email',
        action: async function ($, model) {
            var db = DB();
            // check if user with that email exists
            var user = await db.read('tbl_user').where('email', model.email).promise();
            // if user does not exist, throw error
            if (!user) {
                $.invalid('@(User with that email does not exist)');
                return;
            }
            // create token
            var token = GUID(60);
            // update user
            await db.update('tbl_user', { token }).where('id', user.id).promise();
            // send email
            MAIL(user.email, '@(Reset Password)', '/mail/user-reset', { token, name: user.name }, '');
            $.success();
        }
    });

    // verify reset token
    schema.action('reset', {
        name: 'Verify Reset Token',
        input: '*token:String',
        action: async function ($, model) {
            var db = DB();
            // check if user with that email exists
            var user = await db.read('tbl_user').where('token', model.token).promise();
            // if user does not exist, throw error
            if (!user) {
                $.invalid('@(Invalid token)');
                return;
            }
            $.success();
        }
    });

	schema.action('oauth', {
		name: 'OAuth authorize',
		input: '*sessionid:String',
		action: async function($, model) {

			var response =  await RESTBuilder.GET(CONF.oauthsession.format(model.sessionid)).promise();

			if (!response || !response.id) {
				$.invalid(response);
				return;
			}

			var db = DB();
			var oauthid = response.serviceid + response.id;

			var oauth = await db.read('tbl_user_oauth').where('id', oauthid).promise($);

			if (!oauth) {
				oauth = {};
				oauth.profileid = response.id;
				oauth.serviceid = response.serviceid;
				oauth.logged = 1;
				oauth.dtlogged = NOW;
				oauth.dtcreated = NOW;
			}

			// Important
			oauth.sessionid = response.sessionid;

				var user = await db.read('tbl_user').where('email', response.email).fields('id,is2fa,phone,language,isdisabled').where('isremoved=FALSE').promise($);
			if (user) {

				if (user.isdisabled) {
					$.invalid('@(Account is disabled)');
					return;
				}

				if (oauth.id) {
					await db.modify('tbl_user_oauth', { sessionid: oauth.sessionid, '+logged': 1, dtlogged: NOW, userid: user.id }).id(oauth.id).promise($);
				} else {
					oauth.id = oauthid;
					oauth.userid = user.id;
					await db.insert('tbl_user_oauth', oauth).promise($);
				}

				if (user.is2fa) {
					await CALL('Codes --> sms', { type: '2fa', phone: user.phone, language: user.language }).promise($);
					$.success('code');
				} else
					FUNC.login($, user.id);

				return;
			}

			delete model.sessionid;

			model.id = UID();
			model.name = response.name;
			model.firstname = response.firstname;
			model.lastname = response.lastname;
			model.email = response.email;
			model.login = response.login;
			model.search = model.name.toSearch();
			model.password = '';
			model.token = FUNC.createtoken();
			model.language = CONF.default_language || 'en';
			model.isconfirmed = true;
			model.isoauth = true;
			model.dtcreated = NOW;

			// var count = await db.count('tbl_user').year('dtcreated', NOW.getFullYear()).promise($);
			// model.fakeid = model.number = (NOW.getFullYear() + '').substring(2) + (count + 1).padLeft(6);
			await db.insert('tbl_user', model).promise($);

			oauth.id = oauthid;
			oauth.userid = model.id;
			await db.insert('tbl_user_oauth', oauth).promise($);
			FUNC.login($, model.id);
		}
	});



	schema.action('google', {
		name: 'Google',
		query: '*page:{login|register}',
		action: function($) {
			var url = CONF.clientside + '/' + $.query.page;
			var data = {};
			data.serviceid = 'google';
			data.sessionid = Date.now().toString(36) + GUID(10);
			data.url = url;// Where to redirect user to
			RESTBuilder.POST(CONF.openauth, data).callback($.done(true));
		}
	});


	schema.action('github', {
		name: 'Github',
		query: '*page:{login|register}',
		action: function($) {
			var url = CONF.clientside + '/' + $.query.page;
			var data = {};
			data.serviceid = 'github';
			data.sessionid = Date.now().toString(36) + GUID(10);
			data.url = url;// Where to redirect user to
			RESTBuilder.POST(CONF.openauth, data).callback($.done(true));
		}
	});
});