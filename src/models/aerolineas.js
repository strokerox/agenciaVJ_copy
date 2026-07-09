
// Simple in-memory model for aerolineas (airlines)
// Provides minimal CRUD operations for use in tests or small apps.

const aerolineas = [
	{ id: 1, name: 'Aerolíneas Argentinas', code: 'AR', country: 'Argentina' },
	{ id: 2, name: 'LATAM Airlines', code: 'LA', country: 'Chile' },
	{ id: 3, name: 'Avianca', code: 'AV', country: 'Colombia' }
];

let nextId = aerolineas.length + 1;

function getAll() {
	return [...aerolineas];
}

function getById(id) {
	return aerolineas.find(a => a.id === Number(id)) || null;
}

function add(airline) {
	const item = {
		id: nextId++,
		name: airline.name || 'Unknown',
		code: airline.code || '',
		country: airline.country || ''
	};
	aerolineas.push(item);
	return item;
}

function remove(id) {
	const idx = aerolineas.findIndex(a => a.id === Number(id));
	if (idx === -1) return false;
	aerolineas.splice(idx, 1);
	return true;
}

module.exports = {
	getAll,
	getById,
	add,
	remove,
	_raw: aerolineas // exported for testing
};
