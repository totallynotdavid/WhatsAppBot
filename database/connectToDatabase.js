const supabase = require('./Supabase');

let paidUsers = [];
let physicsUsers = [];

async function insertMessage(phoneNumber, message, group) {
	let { data: /*users,*/ error } = await supabase
		.from('users') // this is the table name
		.insert({ user: phoneNumber, message: message, group: group }); // this is the column name

		if (error) {
				console.log('Could not insert message', error);
		}
}

async function loadPaidUsers() {
  const { data: users, error } = await supabase
    .from('paid_users')
    .select('phone_number');

  if (error) {
    console.error(error);
    return;
  }

  paidUsers = users.map(user => user.phone_number);
}

async function loadPhysicsUsers() {
	const { data: users, error } = await supabase
		.from('physics_users')
		.select('phone_number');

	if (error) {
		console.error(error);
		return;
	}

	physicsUsers = users.map(user => user.phone_number);
}

function getPaidUsers() {
  return paidUsers;
}

function getPhysicsUsers() {
	return physicsUsers;
}

module.exports = {
	insertMessage,
	loadPaidUsers,
	getPaidUsers,
	loadPhysicsUsers,
	getPhysicsUsers,
};