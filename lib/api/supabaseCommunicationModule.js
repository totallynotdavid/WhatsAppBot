const supabase = require('./supabaseClient.js');

async function insertMessage(phoneNumber, message, group) {
  try {
		/* eslint-disable no-unused-vars*/
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

async function insertToTable(tableName, insertData) {
  const { data, error, status } = await supabase
    .from(tableName)
    .insert(insertData);

  if (error) {
    throw error;
  }

  return status === 201;
}

async function searchTable(tableName, column, value) {
  const { data, error } = await supabase
    .from(tableName)
    .select(column)
    .eq(column, value);

  if (error) {
    throw error;
  }

  return data.length > 0;
}

// This section is for the premium groups table

async function searchPremiumGroup(group_id) {
  return searchTable('premium_groups', 'group_id', group_id);
}

async function addPremiumGroup(group_id, group_name, phoneNumber) {
  if(!group_id || !group_name || !phoneNumber) {
    throw new Error('Invalid input data');
  }

  const isPremiumGroup = await searchPremiumGroup(group_id);

  if (isPremiumGroup) {
    throw new Error('Este grupo ya está registrado');
  }

  const insertData = {
    group_id,
    group_name,
    contact_number: phoneNumber,
    isActive: true,
  };

  return insertToTable('premium_groups', insertData);
}

async function deactivateExpired() {
  const { data: premiumUsers, error: usersError } = await supabase
    .from('paid_users')
    .select('*');
  
  if (usersError) {
    throw usersError;
  }

  for (const user of premiumUsers) {
    const premiumExpiry = new Date(user.premium_expiry);

    if (premiumExpiry < new Date()) {
      const { error: updateError } = await supabase
        .from('premium_groups')
        .update({ isActive: false })
        .eq('contact_number', user.phone_number);
      
      if (updateError) {
        throw updateError;
      }
    }
  }

	// We update the last check date to the app metadata table
  const lastCheck = new Date().toISOString();
  await supabase
    .from('app_metadata')
    .update({ lastCheck });
}

// This section is for the paid users table

async function getPremiumUser(phoneNumber) {
  const { data, error } = await supabase
    .from('paid_users')
    .select('*')
    .eq('phone_number', phoneNumber);

  if (error) {
    throw error;
  }

  return data[0];
}

async function addPremiumUser(phoneNumber, customerName, days) {
  // Fetch existing user and get the expiry date
  const user = await getPremiumUser(phoneNumber);
  const date = user ? new Date(user.premium_expiry) : new Date();

  // Add the new days to the date
  date.setDate(date.getDate() + days);
  const premiumExpiry = date.toISOString();

  const upsertData = {
    phone_number: phoneNumber,
    customer_name: customerName,
    premium_expiry: premiumExpiry
  };

  const { data, error, status } = await supabase
    .from('paid_users')
    .upsert(upsertData, { onConflict: 'phone_number' });

  if (error) {
    throw error;
  }

  return status === 200 || status === 201;
}

// This section is for fetching all the data from the database tables

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
	deactivateExpired,
  fetchDataFromTable,
};