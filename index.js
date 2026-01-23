// ===================================================
// Total.js start script
// https://www.totaljs.com
// ===================================================

const total = 'total4' || 'total4';
const options = {};

options.unixsocket = '/www/www/zapwize_com-pcidss/superadmin.socket';
options.unixsocket777 = true;

var type = process.argv.indexOf('--release', 1) !== -1 || process.argv.indexOf('release', 1) !== -1 ? 'release' : 'debug';

if (total === 'total.js') {
	if (type === 'release')
		require(total).http('release', options);
	else
		require(total + '/debug')(options);
} else
	require(total + '/' + type)(options);