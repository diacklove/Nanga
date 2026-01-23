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
};
