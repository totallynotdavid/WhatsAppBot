function formatDate(date) {
	const d = new Date(date);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

async function setBotStatus(client) {
	const lastUpDate = formatDate(new Date());
	await client.setStatus(`¿Por qué estamos aquí?\nActualizado: ${lastUpDate}`);
}

module.exports = {
	setBotStatus,
}