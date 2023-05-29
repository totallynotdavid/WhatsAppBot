const supabase = require('./supabaseClient.js');

async function insertMessage(phoneNumber, message, group) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { data, error } = await supabase
      .from('users')
      .insert({ user: phoneNumber, message: message, group: group });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.log('Could not insert message', error);
  }
}

async function addPremiumGroup(group_id, group_name, phoneNumber) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { data, error } = await supabase
      .from('premium_groups')
      .insert({ group_id: group_id, group_name: group_name, contact_number: phoneNumber });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.log('Could not add group', error);
  }
}

async function searchPremiumGroup(group_id) {
	try {
		const { data, error } = await supabase
			.from('premium_groups')
			.select('group_id')
			.eq('group_id', group_id);
		
		if (error) {
			throw error;
		}

		// return true if the group is already registered, false otherwise
		return data.length > 0;
	} catch (error) {
		console.log('Could not search group', error);
	}
}

async function searchPremiumUser(phoneNumber) {
	try {
		const { data, error } = await supabase
			.from('paid_users')
			.select('phone_number')
			.eq('phone_number', phoneNumber);

		if (error) {
			throw error;
		}

		return data.length > 0;
	} catch (error) {
		console.log('Could not search user', error);
		return false;
	}
}

async function addPremiumUser(phoneNumber, customerName) {
	// we should check if the user is already registered
	const isPremiumUser = await searchPremiumUser(phoneNumber);

	if (isPremiumUser) {
		console.log('User already registered');
		return;
	}

	try {
		// eslint-disable-next-line no-unused-vars
		const { data, error } = await supabase
			.from('paid_users')
			.insert({ phone_number: phoneNumber, customer_name: customerName });

		if (error) {
			throw error;
		}
	} catch (error) {
		console.log('Could not add user', error);
	}

}

async function fetchDataFromTable(table, column) {
  try {
    const { data, error } = await supabase.from(table).select(column);

    if (error) {
      throw error;
    }

    return data.map(record => record[column]);
  } catch (error) {
    console.error(error);
    return [];
  }
}

module.exports = {
  insertMessage,
	addPremiumUser,
	addPremiumGroup,
	searchPremiumGroup,
  fetchDataFromTable,
};