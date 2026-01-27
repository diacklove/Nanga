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


CREATE TABLE public.tbl_pci_requirement (
	id				text NOT NULL,
	code			text NOT NULL,
	title			text NOT NULL,
	description		text,
	category		text,
	sortorder		int4,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_pci_requirement_item (
	id				text NOT NULL,
	requirementid	text NOT NULL,
	code			text,
	title			text NOT NULL,
	description		text,
	evidencehint	text,
	sortorder		int4,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE INDEX idx_pci_requirement_item_req ON tbl_pci_requirement_item(requirementid);


CREATE TABLE public.tbl_pci_assessment (
	id				text NOT NULL,
	name			text NOT NULL,
	period			text,
	status			text DEFAULT 'active',
	ownerid			text,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);


CREATE TABLE public.tbl_pci_assessment_item (
	id				text NOT NULL,
	assessmentid	text NOT NULL,
	requirementitemid text NOT NULL,
	status			text DEFAULT 'not_started',
	score			int2,
	notes			text,
	updatedby		text,
	dtupdated		timestamp,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE INDEX idx_pci_assessment_item_assessment ON tbl_pci_assessment_item(assessmentid);
CREATE INDEX idx_pci_assessment_item_item ON tbl_pci_assessment_item(requirementitemid);


CREATE TABLE public.tbl_pci_evidence (
	id				text NOT NULL,
	assessmentid	text NOT NULL,
	requirementid	text,
	requirementitemid text,
	title			text NOT NULL,
	category		text,
	description		text,
	uri				text,
	uploadedby		text,
	dtcreated		timestamp DEFAULT timezone('utc',now()),
	PRIMARY KEY (id)
);

CREATE INDEX idx_pci_evidence_assessment ON tbl_pci_evidence(assessmentid);
CREATE INDEX idx_pci_evidence_requirement ON tbl_pci_evidence(requirementid);


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
FROM tbl_security_control
UNION ALL
SELECT
	'pci_requirements',
	count(*)
FROM tbl_pci_requirement
UNION ALL
SELECT
	'pci_evidence',
	count(*)
FROM tbl_pci_evidence;

CREATE OR REPLACE VIEW public.view_pci_requirement_readiness AS
SELECT
	r.id,
	r.code,
	r.title,
	COUNT(ai.id) FILTER (WHERE ai.status = 'compliant') AS compliant,
	COUNT(ai.id) FILTER (WHERE ai.status = 'partially_compliant') AS partial,
	COUNT(ai.id) FILTER (WHERE ai.status = 'remediation_required') AS remediation,
	COUNT(ai.id) AS total
FROM tbl_pci_requirement r
JOIN tbl_pci_requirement_item ri ON ri.requirementid = r.id
LEFT JOIN tbl_pci_assessment_item ai ON ai.requirementitemid = ri.id
LEFT JOIN tbl_pci_assessment a ON a.id = ai.assessmentid AND a.status = 'active'
GROUP BY r.id, r.code, r.title;

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

INSERT INTO public.tbl_pci_requirement (id, code, title, sortorder) VALUES
('PCI-1', '1', 'Installer et gerer une configuration de pare-feu pour proteger les donnees des titulaires de cartes', 1),
('PCI-2', '2', 'Ne pas utiliser les mots de passe systeme et autres parametres de securite par defaut definis par le fournisseur', 2),
('PCI-3', '3', 'Proteger les donnees des titulaires de cartes stockees', 3),
('PCI-4', '4', 'Crypter la transmission des donnees des titulaires de cartes sur les reseaux publics ouverts', 4),
('PCI-5', '5', 'Utiliser des logiciels antivirus et les mettre a jour regulierement', 5),
('PCI-6', '6', 'Developper et gerer des systemes et des applications securises', 6),
('PCI-7', '7', 'Restreindre l''acces aux donnees des titulaires de cartes aux seuls individus qui doivent les connaitre', 7),
('PCI-8', '8', 'Affecter un ID unique a chaque utilisateur d''ordinateur', 8),
('PCI-9', '9', 'Restreindre l''acces physique aux donnees des titulaires de cartes', 9),
('PCI-10', '10', 'Effectuer le suivi et surveiller tous les acces aux ressources reseau et aux donnees des titulaires de cartes', 10),
('PCI-11', '11', 'Tester regulierement les processus et les systemes de securite', 11),
('PCI-12', '12', 'Gerer une politique de securite de l''information pour l''ensemble du personnel', 12);

INSERT INTO public.tbl_pci_requirement_item (id, requirementid, code, title, sortorder) VALUES
('PCI-1-01', 'PCI-1', '1.1', 'Standards de configuration firewall avec approbation des connexions externes et changements', 1),
('PCI-1-02', 'PCI-1', '1.2', 'Schema reseau et diagrammes des flux de donnees bancaires maintenus a jour', 2),
('PCI-1-03', 'PCI-1', '1.3', 'Firewall pour Internet et DMZ; limitation du trafic entrant/sortant; revue des regles au moins tous les 6 mois', 3),
('PCI-1-04', 'PCI-1', '1.4', 'Liste documentee des services/ports autorises et justification des protocoles non chiffres', 4),
('PCI-1-05', 'PCI-1', '1.5', 'Segmentation reseau: filtrage stateful, NAT, pas d''acces direct Internet vers CDE, regles DMZ', 5),
('PCI-1-06', 'PCI-1', '1.6', 'Firewalls pour reseaux WiFi et postes avec acces Internet', 6),
('PCI-2-01', 'PCI-2', '2.1', 'Changement des parametres par defaut et suppression des comptes par defaut sur applications de paiement', 7),
('PCI-2-02', 'PCI-2', '2.2', 'Parametres par defaut reseaux sans-fil modifies (password, SNMP, WEP, SSID, SSH/TLS)', 8),
('PCI-2-03', 'PCI-2', '2.3', 'Inventaire des composants systeme dans le perimetre PCI DSS', 9),
('PCI-2-04', 'PCI-2', '2.4', 'Standards de durcissement (SANS/NIST/CIS) et une fonction primaire par serveur', 10),
('PCI-2-05', 'PCI-2', '2.5', 'Desactivation des services, protocoles et fonctionnalites inutiles', 11),
('PCI-2-06', 'PCI-2', '2.6', 'Hebergement partage: isolation des donnees, acces limite, historisation et processus d''investigation', 12),
('PCI-3-01', 'PCI-3', '3.1', 'Stockage minimal des donnees; aucune donnee d''authentification sensible stockee', 13),
('PCI-3-02', 'PCI-3', '3.2', 'Masquage du PAN a l''affichage (6 premiers et 4 derniers)', 14),
('PCI-3-03', 'PCI-3', '3.3', 'PAN rendu illisible (hachage, troncature, chiffrement) sur tous supports et logs', 15),
('PCI-3-04', 'PCI-3', '3.4', 'Gestion des cles: acces restreint, stockage securise, HSM/logiciel', 16),
('PCI-3-05', 'PCI-3', '3.5', 'Processus de gestion des cles (generation, distribution, rotation, destruction, double controle)', 17),
('PCI-3-06', 'PCI-3', '3.6', 'Techniques de protection PAN (tokenisation, masquage, hachage, chiffrement) appliquees', 18),
('PCI-4-01', 'PCI-4', '4.1', 'Chiffrement des transmissions sur reseaux publics ouverts (Internet, WiFi, GSM, GPRS)', 19),
('PCI-4-02', 'PCI-4', '4.2', 'Algorithmes et protocoles de chiffrement eprouves (3DES/AES, TLS 1.1+)', 20),
('PCI-4-03', 'PCI-4', '4.3', 'Reseaux sans-fil: WPA/WPA2, IPSEC/TLS; jamais WEP', 21),
('PCI-4-04', 'PCI-4', '4.4', 'Interdiction de transmission du PAN en clair via canaux non securises', 22),
('PCI-5-01', 'PCI-5', '5.1', 'Anti-virus deployee sur tous les systemes admissibles; controle compensatoire si exclusion', 23),
('PCI-5-02', 'PCI-5', '5.2', 'Anti-virus configure pour detecter et supprimer malware/virus/spyware/adware', 24),
('PCI-5-03', 'PCI-5', '5.3', 'Anti-virus actifs, a jour, avec generation de logs', 25),
('PCI-5-04', 'PCI-5', '5.4', 'Evaluation des menaces malware pour systemes non couverts par antivirus', 26),
('PCI-6-01', 'PCI-6', '6.1', 'Patches systemes/logiciels a jour et surveillance des vulnerabilites (OWASP/SANS)', 27),
('PCI-6-02', 'PCI-6', '6.2', 'Procedures de gestion du changement (tests, approbation, retour arriere, documentation)', 28),
('PCI-6-03', 'PCI-6', '6.3', 'Developpement securise integre des le debut du cycle de vie', 29),
('PCI-6-04', 'PCI-6', '6.4', 'Tests avant deploiement contre vulnerabilites courantes (XSS, etc.)', 30),
('PCI-6-05', 'PCI-6', '6.5', 'Separation des environnements test/production; pas de PAN en test; retrait des donnees test', 31),
('PCI-6-06', 'PCI-6', '6.6', 'Audit du code et controles d''authentification/gestion des sessions', 32),
('PCI-7-01', 'PCI-7', '7.1', 'Acces aux donnees limite au besoin de savoir (need-to-know) et lie aux roles', 33),
('PCI-7-02', 'PCI-7', '7.2', 'Controle d''acces automatise pour appliquer les restrictions', 34),
('PCI-7-03', 'PCI-7', '7.3', 'Principe deny-all par defaut / mode whitelist', 35),
('PCI-7-04', 'PCI-7', '7.4', 'Autorisation formelle signee pour tout nouvel acces', 36),
('PCI-8-01', 'PCI-8', '8.1', 'ID unique attribue a chaque utilisateur avant acces', 37),
('PCI-8-02', 'PCI-8', '8.2', 'Authentification par mot de passe, token, certificat ou biometrie', 38),
('PCI-8-03', 'PCI-8', '8.3', 'Chiffrement des mots de passe en transmission et stockage', 39),
('PCI-8-04', 'PCI-8', '8.4', 'MFA pour acces distants (RADIUS/TACACS+, VPN TLS)', 40),
('PCI-8-05', 'PCI-8', '8.5', 'Gestion du cycle de vie des comptes et verification d''identite pour reset', 41),
('PCI-8-06', 'PCI-8', '8.6', 'Politique de mot de passe (3 mois, 7 caracteres, historique, lockout, timeout)', 42),
('PCI-8-07', 'PCI-8', '8.7', 'Interdiction des comptes partages et MFA pour acces a l''environnement PCI', 43),
('PCI-9-01', 'PCI-9', '9.1', 'Controle d''acces physique aux batiments et systemes', 44),
('PCI-9-02', 'PCI-9', '9.2', 'Protection des dispositifs capturant les donnees carte (anti-tamper)', 45),
('PCI-9-03', 'PCI-9', '9.3', 'Videosurveillance des zones sensibles et retention 3 mois', 46),
('PCI-9-04', 'PCI-9', '9.4', 'Gestion des visiteurs (autorisation, badge, logs, retention)', 47),
('PCI-9-05', 'PCI-9', '9.5', 'Stockage securise des supports/dossiers; distribution controlee; transmission securisee', 48),
('PCI-9-06', 'PCI-9', '9.6', 'Restriction des prises reseau publiques et points d''acces WiFi', 49),
('PCI-10-01', 'PCI-10', '10.1', 'Journalisation des acces aux donnees des porteurs et association a un utilisateur', 50),
('PCI-10-02', 'PCI-10', '10.2', 'Journalisation des actions admin, acces logs, tentatives d''acces, auth, creation/suppression', 51),
('PCI-10-03', 'PCI-10', '10.3', 'Contenu minimal des logs (ID utilisateur, type, date/heure, succes/echec, origine, ressource)', 52),
('PCI-10-04', 'PCI-10', '10.4', 'Synchronisation NTP et protection des parametres de temps', 53),
('PCI-10-05', 'PCI-10', '10.5', 'Revue quotidienne des logs et retention 1 an (3 mois en ligne)', 54),
('PCI-10-06', 'PCI-10', '10.6', 'Protection et integrite des logs, acces limite, centralisation', 55),
('PCI-11-01', 'PCI-11', '11.1', 'Scans trimestriels des points d''acces sans-fil; inventaire et remediation', 56),
('PCI-11-02', 'PCI-11', '11.2', 'Scans de vulnerabilites trimestriels internes/externe et apres changement', 57),
('PCI-11-03', 'PCI-11', '11.3', 'Tests d''intrusion annuels internes/externe, y compris segmentation', 58),
('PCI-11-04', 'PCI-11', '11.4', 'IDS/IPS en place avec alertes et maintien a jour', 59),
('PCI-11-05', 'PCI-11', '11.5', 'Controle d''integrite des fichiers critiques (comparaisons hebdomadaires)', 60),
('PCI-12-01', 'PCI-12', '12.1', 'Politique de securite ecrite, diffusee et mise a jour annuellement', 61),
('PCI-12-02', 'PCI-12', '12.2', 'Politiques d''utilisation des technologies (approbation, inventaire, etiquetage)', 62),
('PCI-12-03', 'PCI-12', '12.3', 'Responsabilites securite definies et documentees', 63),
('PCI-12-04', 'PCI-12', '12.4', 'Programme annuel de sensibilisation a la securite', 64),
('PCI-12-05', 'PCI-12', '12.5', 'Background checks pour personnel manipulant des PAN', 65),
('PCI-12-06', 'PCI-12', '12.6', 'Gestion des tiers (liste, selection, suivi conformite, contrats)', 66),
('PCI-12-07', 'PCI-12', '12.7', 'Plan de reponse aux incidents teste annuellement et equipe joignable 24/7', 67),
('PCI-12-08', 'PCI-12', '12.8', 'Gouvernance PCI (comite, equipe projet, milestones)', 68);

INSERT INTO public.tbl_pci_assessment (id, name, period, status, dtcreated) VALUES ('PCI-ASSESS-2024', 'PCI DSS Readiness 2024', '2024', 'active', timezone('utc',now()));

INSERT INTO public.tbl_pci_assessment_item (id, assessmentid, requirementitemid, status, dtcreated) VALUES
('PCI-AI-001', 'PCI-ASSESS-2024', 'PCI-1-01', 'not_started', timezone('utc',now())),
('PCI-AI-002', 'PCI-ASSESS-2024', 'PCI-1-02', 'not_started', timezone('utc',now())),
('PCI-AI-003', 'PCI-ASSESS-2024', 'PCI-1-03', 'not_started', timezone('utc',now())),
('PCI-AI-004', 'PCI-ASSESS-2024', 'PCI-1-04', 'not_started', timezone('utc',now())),
('PCI-AI-005', 'PCI-ASSESS-2024', 'PCI-1-05', 'not_started', timezone('utc',now())),
('PCI-AI-006', 'PCI-ASSESS-2024', 'PCI-1-06', 'not_started', timezone('utc',now())),
('PCI-AI-007', 'PCI-ASSESS-2024', 'PCI-2-01', 'not_started', timezone('utc',now())),
('PCI-AI-008', 'PCI-ASSESS-2024', 'PCI-2-02', 'not_started', timezone('utc',now())),
('PCI-AI-009', 'PCI-ASSESS-2024', 'PCI-2-03', 'not_started', timezone('utc',now())),
('PCI-AI-010', 'PCI-ASSESS-2024', 'PCI-2-04', 'not_started', timezone('utc',now())),
('PCI-AI-011', 'PCI-ASSESS-2024', 'PCI-2-05', 'not_started', timezone('utc',now())),
('PCI-AI-012', 'PCI-ASSESS-2024', 'PCI-2-06', 'not_started', timezone('utc',now())),
('PCI-AI-013', 'PCI-ASSESS-2024', 'PCI-3-01', 'not_started', timezone('utc',now())),
('PCI-AI-014', 'PCI-ASSESS-2024', 'PCI-3-02', 'not_started', timezone('utc',now())),
('PCI-AI-015', 'PCI-ASSESS-2024', 'PCI-3-03', 'not_started', timezone('utc',now())),
('PCI-AI-016', 'PCI-ASSESS-2024', 'PCI-3-04', 'not_started', timezone('utc',now())),
('PCI-AI-017', 'PCI-ASSESS-2024', 'PCI-3-05', 'not_started', timezone('utc',now())),
('PCI-AI-018', 'PCI-ASSESS-2024', 'PCI-3-06', 'not_started', timezone('utc',now())),
('PCI-AI-019', 'PCI-ASSESS-2024', 'PCI-4-01', 'not_started', timezone('utc',now())),
('PCI-AI-020', 'PCI-ASSESS-2024', 'PCI-4-02', 'not_started', timezone('utc',now())),
('PCI-AI-021', 'PCI-ASSESS-2024', 'PCI-4-03', 'not_started', timezone('utc',now())),
('PCI-AI-022', 'PCI-ASSESS-2024', 'PCI-4-04', 'not_started', timezone('utc',now())),
('PCI-AI-023', 'PCI-ASSESS-2024', 'PCI-5-01', 'not_started', timezone('utc',now())),
('PCI-AI-024', 'PCI-ASSESS-2024', 'PCI-5-02', 'not_started', timezone('utc',now())),
('PCI-AI-025', 'PCI-ASSESS-2024', 'PCI-5-03', 'not_started', timezone('utc',now())),
('PCI-AI-026', 'PCI-ASSESS-2024', 'PCI-5-04', 'not_started', timezone('utc',now())),
('PCI-AI-027', 'PCI-ASSESS-2024', 'PCI-6-01', 'not_started', timezone('utc',now())),
('PCI-AI-028', 'PCI-ASSESS-2024', 'PCI-6-02', 'not_started', timezone('utc',now())),
('PCI-AI-029', 'PCI-ASSESS-2024', 'PCI-6-03', 'not_started', timezone('utc',now())),
('PCI-AI-030', 'PCI-ASSESS-2024', 'PCI-6-04', 'not_started', timezone('utc',now())),
('PCI-AI-031', 'PCI-ASSESS-2024', 'PCI-6-05', 'not_started', timezone('utc',now())),
('PCI-AI-032', 'PCI-ASSESS-2024', 'PCI-6-06', 'not_started', timezone('utc',now())),
('PCI-AI-033', 'PCI-ASSESS-2024', 'PCI-7-01', 'not_started', timezone('utc',now())),
('PCI-AI-034', 'PCI-ASSESS-2024', 'PCI-7-02', 'not_started', timezone('utc',now())),
('PCI-AI-035', 'PCI-ASSESS-2024', 'PCI-7-03', 'not_started', timezone('utc',now())),
('PCI-AI-036', 'PCI-ASSESS-2024', 'PCI-7-04', 'not_started', timezone('utc',now())),
('PCI-AI-037', 'PCI-ASSESS-2024', 'PCI-8-01', 'not_started', timezone('utc',now())),
('PCI-AI-038', 'PCI-ASSESS-2024', 'PCI-8-02', 'not_started', timezone('utc',now())),
('PCI-AI-039', 'PCI-ASSESS-2024', 'PCI-8-03', 'not_started', timezone('utc',now())),
('PCI-AI-040', 'PCI-ASSESS-2024', 'PCI-8-04', 'not_started', timezone('utc',now())),
('PCI-AI-041', 'PCI-ASSESS-2024', 'PCI-8-05', 'not_started', timezone('utc',now())),
('PCI-AI-042', 'PCI-ASSESS-2024', 'PCI-8-06', 'not_started', timezone('utc',now())),
('PCI-AI-043', 'PCI-ASSESS-2024', 'PCI-8-07', 'not_started', timezone('utc',now())),
('PCI-AI-044', 'PCI-ASSESS-2024', 'PCI-9-01', 'not_started', timezone('utc',now())),
('PCI-AI-045', 'PCI-ASSESS-2024', 'PCI-9-02', 'not_started', timezone('utc',now())),
('PCI-AI-046', 'PCI-ASSESS-2024', 'PCI-9-03', 'not_started', timezone('utc',now())),
('PCI-AI-047', 'PCI-ASSESS-2024', 'PCI-9-04', 'not_started', timezone('utc',now())),
('PCI-AI-048', 'PCI-ASSESS-2024', 'PCI-9-05', 'not_started', timezone('utc',now())),
('PCI-AI-049', 'PCI-ASSESS-2024', 'PCI-9-06', 'not_started', timezone('utc',now())),
('PCI-AI-050', 'PCI-ASSESS-2024', 'PCI-10-01', 'not_started', timezone('utc',now())),
('PCI-AI-051', 'PCI-ASSESS-2024', 'PCI-10-02', 'not_started', timezone('utc',now())),
('PCI-AI-052', 'PCI-ASSESS-2024', 'PCI-10-03', 'not_started', timezone('utc',now())),
('PCI-AI-053', 'PCI-ASSESS-2024', 'PCI-10-04', 'not_started', timezone('utc',now())),
('PCI-AI-054', 'PCI-ASSESS-2024', 'PCI-10-05', 'not_started', timezone('utc',now())),
('PCI-AI-055', 'PCI-ASSESS-2024', 'PCI-10-06', 'not_started', timezone('utc',now())),
('PCI-AI-056', 'PCI-ASSESS-2024', 'PCI-11-01', 'not_started', timezone('utc',now())),
('PCI-AI-057', 'PCI-ASSESS-2024', 'PCI-11-02', 'not_started', timezone('utc',now())),
('PCI-AI-058', 'PCI-ASSESS-2024', 'PCI-11-03', 'not_started', timezone('utc',now())),
('PCI-AI-059', 'PCI-ASSESS-2024', 'PCI-11-04', 'not_started', timezone('utc',now())),
('PCI-AI-060', 'PCI-ASSESS-2024', 'PCI-11-05', 'not_started', timezone('utc',now())),
('PCI-AI-061', 'PCI-ASSESS-2024', 'PCI-12-01', 'not_started', timezone('utc',now())),
('PCI-AI-062', 'PCI-ASSESS-2024', 'PCI-12-02', 'not_started', timezone('utc',now())),
('PCI-AI-063', 'PCI-ASSESS-2024', 'PCI-12-03', 'not_started', timezone('utc',now())),
('PCI-AI-064', 'PCI-ASSESS-2024', 'PCI-12-04', 'not_started', timezone('utc',now())),
('PCI-AI-065', 'PCI-ASSESS-2024', 'PCI-12-05', 'not_started', timezone('utc',now())),
('PCI-AI-066', 'PCI-ASSESS-2024', 'PCI-12-06', 'not_started', timezone('utc',now())),
('PCI-AI-067', 'PCI-ASSESS-2024', 'PCI-12-07', 'not_started', timezone('utc',now())),
('PCI-AI-068', 'PCI-ASSESS-2024', 'PCI-12-08', 'not_started', timezone('utc',now()));

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
