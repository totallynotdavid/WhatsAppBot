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
  fetchDataFromTable,
};