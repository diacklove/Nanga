global.USER_ROLE_DEFINITIONS = [
	{
		id: 'administrator',
		name: 'Administrator',
		description: 'Full governance and user lifecycle control.',
		permissions: {
			users: ['read', 'write'],
			transactions: ['read', 'write'],
			alerts: ['read', 'write'],
			pci: ['read', 'write'],
			audit: ['read', 'write'],
			terminals: ['read', 'write'],
			fraud: ['read', 'write'],
			notification: ['read', 'write']
		}
	},
	{
		id: 'analyst',
		name: 'Analyst',
		description: 'Operational monitoring and fraud analysis.',
		permissions: {
			users: ['read'],
			transactions: ['read'],
			alerts: ['read', 'write'],
			pci: ['read'],
			audit: ['read'],
			terminals: ['read'],
			fraud: ['read', 'write'],
			notification: ['read']
		}
	},
	{
		id: 'auditor',
		name: 'Auditor',
		description: 'Compliance review and evidence oversight.',
		permissions: {
			users: ['read'],
			transactions: ['read'],
			alerts: ['read'],
			pci: ['read'],
			audit: ['read'],
			terminals: ['read'],
			fraud: ['read'],
			notification: ['read']
		}
	},
	{
		id: 'supervisor',
		name: 'Supervisor',
		description: 'Operational governance with limited write access.',
		permissions: {
			users: ['read'],
			transactions: ['read', 'write'],
			alerts: ['read', 'write'],
			pci: ['read'],
			audit: ['read'],
			terminals: ['read'],
			fraud: ['read', 'write'],
			notification: ['read']
		}
	},
	{
		id: 'compliance',
		name: 'Compliance Officer',
		description: 'PCI DSS controls and audit readiness.',
		permissions: {
			users: ['read'],
			transactions: ['read'],
			alerts: ['read'],
			pci: ['read', 'write'],
			audit: ['read', 'write'],
			terminals: ['read'],
			fraud: ['read'],
			notification: ['read']
		}
	}
];

global.getRoleDefinition = function(role) {
	var roles = global.USER_ROLE_DEFINITIONS || [];
	return roles.find(item => item.id === role) || roles[1] || roles[0];
};

global.getPermissionsForRole = function(role) {
	var definition = global.getRoleDefinition(role);
	return definition ? definition.permissions : {};
};

global.getPermissionKeys = function(role) {
	var permissions = global.getPermissionsForRole(role);
	return Object.keys(permissions || {});
};

global.hasPermission = function(user, permission) {
	if (!user)
		return false;
	if (user.sa)
		return true;
	var list = user.permissions || [];
	return list.includes(permission);
};
