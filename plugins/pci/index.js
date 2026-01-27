exports.icon = 'ti ti-shield-lock';
exports.name = '@(PCI Compliance)';
exports.position = 70;
exports.permissions = [{ id: 'pci', name: 'PCI' }];
exports.visible = user => user.sa || user.permissions.includes('pci');

exports.install = function() {
	ROUTE('+API    /api/    -pci_scope           --> PCI/scope');
	ROUTE('+API    /api/    -pci_controls        --> PCI/controls');
	ROUTE('+API    /api/    -pci_dashboard       --> PCI/dashboard');
	ROUTE('+API    /api/    +pci_scope_update/{id} --> PCI/scope_update');
	ROUTE('+API    /api/    -pci_requirements    --> PCI/requirements');
	ROUTE('+API    /api/    -pci_requirement/{id} --> PCI/requirement');
	ROUTE('+API    /api/    +pci_assessment_item/{id} --> PCI/assessment_item_update');
	ROUTE('+API    /api/    -pci_evidence        --> PCI/evidence');
	ROUTE('+API    /api/    +pci_evidence_add    --> PCI/evidence_add');
	ROUTE('+API    /api/    -pci_readiness       --> PCI/readiness');
};
