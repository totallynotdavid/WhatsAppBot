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

  return insertToTable('premium_groups', { group_id, group_name, contact_number: phoneNumber });
}

async function searchPremiumUser(phoneNumber) {
  return searchTable('paid_users', 'phone_number', phoneNumber);
}

async function addPremiumUser(phoneNumber, customerName) {
  if(!phoneNumber || !customerName) {
    throw new Error('Datos de entrada inválidos');
  }

  const isPremiumUser = await searchPremiumUser(phoneNumber);

  if (isPremiumUser) {
    throw new Error('User already registered');
  }

  return insertToTable('paid_users', { phone_number: phoneNumber, customer_name: customerName });
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
  fetchDataFromTable,
};