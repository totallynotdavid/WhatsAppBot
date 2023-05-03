const supabase = require('./supabase');

let premiumGroups = [];
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

async function loadPremiumGroups() {
	const { data: groups, error } = await supabase
		.from('premium_groups')
		.select('group_id');

	if (error) {
		console.error(error);
		return;
	}

	premiumGroups = groups.map(group => group.group_id);
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

function getPremiumGroups() {
	return premiumGroups;
}

function getPaidUsers() {
  return paidUsers;
}

function getPhysicsUsers() {
	return physicsUsers;
}

module.exports = {
	insertMessage,
	loadPremiumGroups,
	getPremiumGroups,
	loadPaidUsers,
	getPaidUsers,
	loadPhysicsUsers,
	getPhysicsUsers,
};