NEWSCHEMA('PCI', function(schema) {


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

	// List requirements with readiness summary
	schema.action('requirements', {
		name: 'List PCI Requirements',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			var requirements = await db.find('tbl_pci_requirement').sort('sortorder').promise();
			var items = await db.find('tbl_pci_requirement_item').sort('sortorder').promise();
			var assessmentItems = await db.find('tbl_pci_assessment_item').where('assessmentid', assessment.id).promise();

			var statusByItem = {};
			var notesByItem = {};
			assessmentItems.forEach(function(item) {
				statusByItem[item.requirementitemid] = item.status || 'not_started';
				notesByItem[item.requirementitemid] = item.notes || '';
			});

			var itemsByRequirement = {};
			items.forEach(function(item) {
				var reqid = item.requirementid;
				if (!itemsByRequirement[reqid])
					itemsByRequirement[reqid] = [];
				itemsByRequirement[reqid].push(item);
			});

			var response = requirements.map(function(req) {
				var reqItems = itemsByRequirement[req.id] || [];
				var totals = { total: reqItems.length, compliant: 0, partial: 0, remediation: 0, not_started: 0 };
				reqItems.forEach(function(item) {
					var status = statusByItem[item.id] || 'not_started';
					if (status === 'compliant')
						totals.compliant++;
					else if (status === 'partially_compliant')
						totals.partial++;
					else if (status === 'remediation_required')
						totals.remediation++;
					else
						totals.not_started++;
				});

				var readiness = resolveReadiness(totals);
				return {
					id: req.id,
					code: req.code,
					title: req.title,
					status: readiness,
					counts: totals,
					score: totals.total ? Math.round((totals.compliant / totals.total) * 100) : 0
				};
			});

			$.callback(response);
		}
	});

	// Read requirement detail with items, statuses, and evidence
	schema.action('requirement', {
		name: 'Read PCI Requirement',
		params: '*id:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			var requirement = await db.read('tbl_pci_requirement').where('id', $.params.id).promise();

			if (!requirement) {
				$.invalid('@(Requirement not found)');
				return;
			}

			var items = await db.find('tbl_pci_requirement_item').where('requirementid', requirement.id).sort('sortorder').promise();
			var assessmentItems = await db.find('tbl_pci_assessment_item').where('assessmentid', assessment.id).promise();
			var assessmentByItem = {};
			assessmentItems.forEach(function(item) {
				assessmentByItem[item.requirementitemid] = item;
			});

			var evidence = await db.find('tbl_pci_evidence')
				.where('assessmentid', assessment.id)
				.where('requirementid', requirement.id)
				.sort('dtcreated', true)
				.promise();

			var response = {
				requirement: requirement,
				items: items.map(function(item) {
					var assessmentItem = assessmentByItem[item.id] || {};
					return {
						id: item.id,
						code: item.code,
						title: item.title,
						description: item.description,
						status: assessmentItem.status || 'not_started',
						notes: assessmentItem.notes || ''
					};
				}),
				evidence: evidence
			};

			$.callback(response);
		}
	});

	// Update assessment item status
	schema.action('assessment_item_update', {
		name: 'Update PCI Assessment Item',
		params: '*id:String',
		input: 'status:String,notes:String',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var allowed = { not_started: 1, partially_compliant: 1, compliant: 1, remediation_required: 1 };
			if (!allowed[model.status]) {
				$.invalid('@(Invalid status)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			var existing = await db.read('tbl_pci_assessment_item')
				.where('assessmentid', assessment.id)
				.where('requirementitemid', $.params.id)
				.promise();

			var payload = {
				status: model.status,
				notes: model.notes,
				updatedby: $.user.id,
				dtupdated: NOW
			};

			if (existing) {
				await db.update('tbl_pci_assessment_item', payload)
					.where('id', existing.id)
					.promise();
			} else {
				payload.id = UID();
				payload.assessmentid = assessment.id;
				payload.requirementitemid = $.params.id;
				await db.insert('tbl_pci_assessment_item', payload).promise();
			}

			audit($, 'update', $.params.id, 'PCI assessment item updated');
			$.success();
		}
	});

	// List evidence
	schema.action('evidence', {
		name: 'List PCI Evidence',
		query: 'requirementid:String,requirementitemid:String',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			var builder = db.find('tbl_pci_evidence').where('assessmentid', assessment.id);
			$.query.requirementid && builder.where('requirementid', $.query.requirementid);
			$.query.requirementitemid && builder.where('requirementitemid', $.query.requirementitemid);
			builder.sort('dtcreated', true);

			var response = await builder.promise();
			$.callback(response);
		}
	});

	// Add evidence record
	schema.action('evidence_add', {
		name: 'Add PCI Evidence',
		input: 'requirementid:String,requirementitemid:String,title:String,category:String,description:String,uri:String',
		action: async function($, model) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			if (!model.title) {
				$.invalid('@(Evidence title required)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			await db.insert('tbl_pci_evidence', {
				id: UID(),
				assessmentid: assessment.id,
				requirementid: model.requirementid,
				requirementitemid: model.requirementitemid,
				title: model.title,
				category: model.category,
				description: model.description,
				uri: model.uri,
				uploadedby: $.user.id,
				dtcreated: NOW
			}).promise();

			audit($, 'create', model.requirementid || 'PCI evidence', 'PCI evidence added');
			$.success();
		}
	});

	// Readiness summary
	schema.action('readiness', {
		name: 'PCI Readiness Summary',
		action: async function($) {
			if (!global.hasPermission($.user, 'pci')) {
				$.invalid('@(Not authorized)');
				return;
			}

			var db = DB();
			var assessment = await getActiveAssessment(db);
			var items = await db.find('tbl_pci_assessment_item').where('assessmentid', assessment.id).promise();

			var totals = { total: items.length, compliant: 0, partial: 0, remediation: 0, not_started: 0 };
			items.forEach(function(item) {
				if (item.status === 'compliant')
					totals.compliant++;
				else if (item.status === 'partially_compliant')
					totals.partial++;
				else if (item.status === 'remediation_required')
					totals.remediation++;
				else
					totals.not_started++;
			});

			var response = {
				status: resolveReadiness(totals),
				score: totals.total ? Math.round((totals.compliant / totals.total) * 100) : 0,
				counts: totals
			};
			$.callback(response);
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

	async function getActiveAssessment(db) {
		var assessment = await db.read('tbl_pci_assessment').where('status', 'active').sort('dtcreated', true).promise();
		if (assessment)
			return assessment;

		assessment = {
			id: UID(),
			name: 'PCI DSS Readiness',
			period: new Date().getUTCFullYear().toString(),
			status: 'active',
			dtcreated: NOW
		};
		await db.insert('tbl_pci_assessment', assessment).promise();
		return assessment;
	}

	function resolveReadiness(totals) {
		if (!totals.total || totals.not_started === totals.total)
			return 'not_started';
		if (totals.remediation > 0)
			return 'remediation_required';
		if (totals.compliant === totals.total)
			return 'compliant';
		return 'partially_compliant';
	}

});
