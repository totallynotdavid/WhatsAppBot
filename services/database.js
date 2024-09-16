const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function fetchLastNMessages(phoneNumber, group, n) {
    try {
        const { data, error } = await supabase
            .from("gpt_messages")
            .select("message, sender, created_at")
            .eq("user", phoneNumber)
            .eq("group", group)
            .order("created_at", { ascending: false })
            .limit(n);

        if (error) throw error;

        return data.reverse();
    } catch (error) {
        console.error("Could not fetch messages", error);
        return [];
    }
}

async function addMessage(phoneNumber, group, sender, message) {
    try {
        const { error } = await supabase
            .from("gpt_messages")
            .insert({ user: phoneNumber, group, sender, message });

        if (error) throw error;
    } catch (error) {
        console.error("Error adding message to database:", error);
    }
}

module.exports = {
    fetchLastNMessages,
    addMessage,
};
