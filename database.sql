CREATE TABLE public.tbl_user (
	id				text NOT NULL,
	name			text NOT NULL,
	email			text NOT NULL,
	passwordhash	text NOT NULL,
	role			text NOT NULL,
	status			text DEFAULT 'active',
	ismfa			bool DEFAULT FALSE,
	dtlastlogin		timestamp,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


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