CREATE TABLE public.tbl_user (
	id				text NOT NULL,
	name			text NOT NULL,
	email			text NOT NULL,
	passwordhash	text NOT NULL,
	phone			text,
	role			text NOT NULL,
	status			text DEFAULT 'active',
	ismfa			bool DEFAULT FALSE,
	token			text,
	isconfirmed		bool DEFAULT FALSE,
	language		text,
	dtlastlogin		timestamp,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_session (
	id				text NOT NULL,
	userid			text NOT NULL,
	token			text NOT NULL,
	ip				text,
	ua				text,
	device			text,
	expires			timestamp,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE INDEX idx_session_token ON public.tbl_session(token);


CREATE TABLE public.tbl_pci_scope (
	id				text NOT NULL,
	name			text NOT NULL,
	zone			text NOT NULL,
	description		text,
	isinscope		bool DEFAULT TRUE,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_terminal (
	id				text NOT NULL,
	name			text NOT NULL,
	type			text NOT NULL,
	country			text NOT NULL,
	city			text NOT NULL,
	latitude		numeric(9,6),
	longitude		numeric(9,6),
	isactive		bool DEFAULT TRUE,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_transaction (
	id				text NOT NULL,
	terminalid		text,
	reference		text NOT NULL,
	currency		text NOT NULL,
	channel			text NOT NULL,
	country			text NOT NULL,
	city			text NOT NULL,
	cardhash		text NOT NULL,
	status			text NOT NULL,
	amount			numeric(12,2) NOT NULL,
	dttransaction	timestamp NOT NULL,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE TABLE public.tbl_fraud_score (
	id				text NOT NULL,
	transactionid	text NOT NULL,
	model			text,
	decision		text,
	riskscore		int2,
	dtanalysed		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_alert (
	id				text NOT NULL,
	transactionid	text NOT NULL,
	userid			text,
	level			text NOT NULL,
	reason			text,
	status			text DEFAULT 'open',
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_alert (
	id				text NOT NULL,
	transactionid	text NOT NULL,
	userid			text,
	level			text NOT NULL,
	reason			text,
	status			text DEFAULT 'open',
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE TABLE public.tbl_audit_log (
	id				text NOT NULL,
	userid			text,
	action			text NOT NULL,
	resource		text NOT NULL,
	ipaddress		text,
	result			text,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_security_control (
	id				text NOT NULL,
	type			text NOT NULL,
	status			text NOT NULL,
	dtchecked		timestamp,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE VIEW public.view_fraud_monitoring AS
SELECT
	t.id,
	t.reference,
	t.amount,
	t.currency,
	t.channel,
	t.country,
	t.city,
	f.riskscore,
	f.decision,
	f.dtanalysed
FROM tbl_transaction t
JOIN tbl_fraud_score f ON f.transactionid=t.id;


CREATE VIEW public.view_active_alert AS
SELECT
	a.id,
	t.reference,
	a.level,
	a.reason,
	a.dtcreated
FROM tbl_alert a
JOIN tbl_transaction t ON t.id=a.transactionid
WHERE a.status='open';

CREATE OR REPLACE VIEW public.view_alerts_ui AS
SELECT
	a.id,
	a.status,
	a.dtcreated AS timestamp,
	CASE
		WHEN a.level ILIKE 'critical' THEN 'Critical'
		WHEN a.level ILIKE 'warning' THEN 'Warning'
		WHEN a.level ILIKE 'high' THEN 'Critical'
		WHEN a.level ILIKE 'medium' THEN 'Warning'
		ELSE INITCAP(a.level)
	END AS severity,
	a.reason AS rule,
	COALESCE(u.name, 'Fraud Desk') AS owner,
	t.reference
FROM tbl_alert a
LEFT JOIN tbl_user u ON u.id=a.userid
LEFT JOIN tbl_transaction t ON t.id=a.transactionid;

CREATE OR REPLACE VIEW public.view_audit_ui AS
SELECT
	l.id,
	COALESCE(u.name, 'System') AS actor,
	l.action,
	l.resource AS target,
	l.dtcreated AS time
FROM tbl_audit_log l
LEFT JOIN tbl_user u ON u.id=l.userid;


CREATE VIEW public.view_pci_compliance AS
SELECT
	'logging' AS name,
	count(*) AS value
FROM tbl_audit_log
UNION ALL
SELECT
	'security_controls',
	count(*)
FROM tbl_security_control;

CREATE OR REPLACE FUNCTION public.fn_create_alert()
RETURNS trigger AS $$
BEGIN
	IF NEW.riskscore>=70 THEN
		INSERT INTO tbl_alert (
			id,
			transactionid,
			level,
			reason
		) VALUES (
			gen_random_uuid()::text,
			NEW.transactionid,
			'high',
			'high fraud risk detected'
		);
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_fraud_alert
AFTER INSERT ON tbl_fraud_score
FOR EACH ROW
EXECUTE FUNCTION fn_create_alert();


CREATE OR REPLACE FUNCTION public.fn_log_audit(
	p_userid text,
	p_action text,
	p_resource text,
	p_ip text,
	p_result text
)
RETURNS void AS $$
BEGIN
	INSERT INTO tbl_audit_log (
		id,
		userid,
		action,
		resource,
		ipaddress,
		result
	) VALUES (
		gen_random_uuid()::text,
		p_userid,
		p_action,
		p_resource,
		p_ip,
		p_result
	);
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_transaction_dt ON tbl_transaction(dttransaction);
CREATE INDEX idx_fraud_score_transaction ON tbl_fraud_score(transactionid);
CREATE INDEX idx_alert_status ON tbl_alert(status);
CREATE INDEX idx_audit_dt ON tbl_audit_log(dtcreated);


CREATE TABLE "public"."tbl_notification" (
    id text NOT NULL,
    userid text,
    title text NOT NULL,
    message text NOT NULL,
    "type" text NOT NULL,
    status text,
    priority int4,
    color text,
    icon text,
    isadmin bool NOT NULL DEFAULT false,
    isdelivery bool NOT NULL DEFAULT false,
    dtcreated timestamp NOT NULL,
    dtread timestamp,
    search text,
    isread bool NOT NULL DEFAULT false,
    "schema" text,
    "date" text,
    "time" text,
    isstarred bool NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

-- Seed data from frontend placeholders
INSERT INTO public.tbl_user (
	id,
	name,
	email,
	passwordhash,
	phone,
	role,
	status,
	ismfa,
	token,
	isconfirmed,
	language,
	dtlastlogin,
	dtcreated
) VALUES
	('USR-01', 'Awa Sawadogo', 'awa.sawadogo@nanga.io', 'mock-hash', '+226 01 45 98 77', 'administrator', 'active', FALSE, NULL, FALSE, 'en', '2024-06-18 09:12:00+00', '2024-06-01 08:00:00+00'),
	('USR-02', 'Jean Ouedraogo', 'jean.oued@nanga.io', 'mock-hash', '+226 07 44 23 10', 'analyst', 'active', FALSE, NULL, FALSE, 'en', '2024-06-17 15:24:00+00', '2024-06-02 09:30:00+00'),
	('USR-03', 'Sali Zongo', 'sali.zongo@nanga.io', 'mock-hash', '+226 05 11 88 62', 'auditor', 'disabled', FALSE, NULL, FALSE, 'en', '2024-06-12 11:05:00+00', '2024-05-28 10:20:00+00');

INSERT INTO public.tbl_transaction (
	id,
	terminalid,
	reference,
	currency,
	channel,
	country,
	city,
	cardhash,
	status,
	amount,
	dttransaction,
	dtcreated
) VALUES
	('TX-4981', NULL, 'TX-4981', 'XOF', 'POS', 'BF', 'Ouagadougou', 'cardhash-4981', 'Approved', 45000.00, '2024-06-19 10:12:00+00', '2024-06-19 10:12:10+00'),
	('TX-4980', NULL, 'TX-4980', 'XOF', 'ATM', 'BF', 'Bobo-Dioulasso', 'cardhash-4980', 'Pending', 130000.00, '2024-06-19 10:09:00+00', '2024-06-19 10:09:10+00'),
	('TX-4979', NULL, 'TX-4979', 'XOF', 'Mobile', 'BF', 'Koudougou', 'cardhash-4979', 'Declined', 22000.00, '2024-06-19 10:05:00+00', '2024-06-19 10:05:10+00'),
	('TX-2041', NULL, 'TX-2041', 'XOF', 'Card', 'BF', 'Ouahigouya', 'cardhash-2041', 'Approved', 125000.00, '2024-06-18 14:22:00+00', '2024-06-18 14:22:10+00'),
	('TX-2040', NULL, 'TX-2040', 'XOF', 'ATM', 'BF', 'Banfora', 'cardhash-2040', 'Pending', 75000.00, '2024-06-18 14:18:00+00', '2024-06-18 14:18:10+00');

INSERT INTO public.tbl_terminal (
	id,
	name,
	type,
	country,
	city,
	latitude,
	longitude,
	isactive,
	dtcreated
) VALUES
	('TM-001', 'Ouaga Central POS', 'POS', 'BF', 'Ouagadougou', 12.3714, -1.5197, TRUE, '2024-06-12 08:30:00+00'),
	('TM-002', 'Bobo ATM Hub', 'ATM', 'BF', 'Bobo-Dioulasso', 11.1771, -4.2979, TRUE, '2024-06-12 08:35:00+00'),
	('TM-003', 'Koudougou Mobile', 'Mobile', 'BF', 'Koudougou', 12.2520, -2.3620, FALSE, '2024-06-12 08:40:00+00');

INSERT INTO public.tbl_fraud_score (
	id,
	transactionid,
	model,
	decision,
	riskscore,
	dtanalysed
) VALUES
	('FS-001', 'TX-4981', 'spark-risk', 'review', 62, '2024-06-19 10:13:30+00'),
	('FS-002', 'TX-4980', 'spark-risk', 'monitor', 55, '2024-06-19 10:10:30+00'),
	('FS-003', 'TX-2041', 'spark-risk', 'approve', 28, '2024-06-18 14:23:30+00');

INSERT INTO public.tbl_alert (
	id,
	transactionid,
	userid,
	level,
	reason,
	status,
	dtcreated
) VALUES
	('AL-204', 'TX-4981', NULL, 'critical', 'High velocity', 'open', '2024-06-19 10:13:00+00'),
	('AL-203', 'TX-4980', NULL, 'warning', 'Geo mismatch', 'investigating', '2024-06-19 10:10:00+00'),
	('AL-118', 'TX-2041', NULL, 'critical', 'Velocity anomaly', 'open', '2024-06-18 14:23:00+00'),
	('AL-117', 'TX-2040', NULL, 'warning', 'Geo mismatch', 'investigating', '2024-06-18 14:19:00+00');

INSERT INTO public.tbl_pci_scope (
	id,
	name,
	zone,
	description,
	isinscope,
	dtcreated
) VALUES
	('C-01', 'Core API', 'Security', 'Status: In scope', TRUE, '2024-06-10 08:00:00+00'),
	('C-02', 'Web Console', 'Compliance', 'Status: In scope', TRUE, '2024-06-10 08:05:00+00'),
	('C-03', 'Audit Vault', 'Audit', 'Status: In scope', TRUE, '2024-06-10 08:10:00+00');

INSERT INTO public.tbl_security_control (
	id,
	type,
	status,
	dtchecked,
	dtcreated
) VALUES
	('PCI-1.2', 'Network segmentation', 'Compliant', '2024-06-15 09:00:00+00', '2024-06-10 08:20:00+00'),
	('PCI-7.1', 'Access restriction', 'Monitoring', '2024-06-15 09:05:00+00', '2024-06-10 08:21:00+00'),
	('PCI-10.2', 'Audit logging', 'Compliant', '2024-06-15 09:10:00+00', '2024-06-10 08:22:00+00');

INSERT INTO public.tbl_audit_log (
	id,
	userid,
	action,
	resource,
	ipaddress,
	result,
	dtcreated
) VALUES
	('AU-101', 'USR-03', 'Reviewed access matrix', 'User roles', NULL, 'ok', '2024-06-17 16:40:00+00'),
	('AU-100', NULL, 'Rotated audit keys', 'Key vault', NULL, 'ok', '2024-06-17 16:10:00+00');

INSERT INTO public.tbl_notification (
	id,
	userid,
	title,
	message,
	"type",
	status,
	priority,
	color,
	icon,
	isadmin,
	isdelivery,
	dtcreated,
	dtread,
	search,
	isread,
	"schema",
	"date",
	"time",
	isstarred
) VALUES
	(
		'NT-001',
		'USR-01',
		'Fraud alert assigned',
		'High velocity alert requires review.',
		'alert',
		'open',
		1,
		'red',
		'alert-triangle',
		FALSE,
		TRUE,
		'2024-06-19 10:14:00+00',
		NULL,
		'fraud alert review',
		FALSE,
		'alerts',
		'2024-06-19',
		'10:14',
		FALSE
	),
	(
		'NT-002',
		NULL,
		'PCI scope update',
		'Web Console asset remains in scope.',
		'compliance',
		'info',
		2,
		'blue',
		'shield',
		TRUE,
		FALSE,
		'2024-06-18 09:30:00+00',
		NULL,
		'pci scope update',
		FALSE,
		'pci_scope',
		'2024-06-18',
		'09:30',
		FALSE
	);
