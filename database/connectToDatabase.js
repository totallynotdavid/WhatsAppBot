const supabase = require('./Supabase');

/*
// This is an example of how to fetch data from the database, not used in the bot
async function fetchMessages() {
    let { data: users, error } = await supabase
        .from('users') // this is the table name
        .select(); // this is the column name

        if (error) {
            console.log('Could not fetch users');
        }
        if (users) {
            console.log('Users fetched successfully');
        }

    users.forEach(user => {
        console.log(`${user.user} has sent the following message: '${user.message}'`);
    });
}
*/

async function insertMessage(phoneNumber, message, group) {
	let { data: /*users,*/ error } = await supabase
		.from('users') // this is the table name
		.insert({ user: phoneNumber, message: message, group: group }); // this is the column name

		if (error) {
				console.log('Could not insert message', error);
		}
		/*
		// Whys is users always null? It doesn't matter if RLS is enabled or not
		// I'm not sure if this is a bug or if I'm doing something wrong
		// .from('users') works fine in the fetchMessages() function
		if (users) {
				console.log('Message inserted successfully');
		}
		*/
}

module.exports = {
    insertMessage,
};