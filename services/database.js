const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function fetchLastNMessages(senderId, groupId, n) {
    const { data, error } = await supabase
        .from("gpt_messages")
        .select("role, content")
        .eq("sender_id", senderId)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(n);

    if (error) throw error;
    return data.reverse();
}

async function addMessage(senderId, groupId, role, content) {
    const { error } = await supabase
        .from("gpt_messages")
        .insert({ sender_id: senderId, group_id: groupId, role, content });

    if (error) throw error;
}

module.exports = {
    fetchLastNMessages,
    addMessage,
};
