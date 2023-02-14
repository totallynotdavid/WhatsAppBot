const supabase = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseClient = supabase.createClient({
  apiKey: process.env.SUPABASE_API_KEY,
  authKey: process.env.SUPABASE_AUTH_KEY,
  baseUrl: process.env.SUPABASE_BASE_URL
});

const getData = async (tableName) => {
  try {
    const result = await supabaseClient.from(tableName).select('*');
    return result.body.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to get data from ${tableName} table`);
  }
};

const insertData = async (tableName, data) => {
  try {
    const result = await supabaseClient.from(tableName).insert(data);
    return result.body.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to insert data into ${tableName} table`);
  }
};

const updateData = async (tableName, data, conditions) => {
  try {
    const result = await supabaseClient.from(tableName).update(data, conditions);
    return result.body.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to update data in ${tableName} table`);
  }
};

const deleteData = async (tableName, conditions) => {
  try {
    const result = await supabaseClient.from(tableName).delete(conditions);
    return result.body.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to delete data from ${tableName} table`);
  }
};

module.exports = {
  getData,
  insertData,
  updateData,
  deleteData
};