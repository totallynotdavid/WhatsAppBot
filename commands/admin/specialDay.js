const supabase = require(`../../lib/api/supabaseCommunicationModule.js`);

async function activateSpecialDay(senderPhoneNumber, groupId) {
    const groupWithActivatedDay = await supabase.searchTable(
        "premium_groups",
        "contact_number",
        senderPhoneNumber
    );

    if (
        groupWithActivatedDay &&
        groupWithActivatedDay.special_day_expiry > new Date()
    ) {
        throw new Error(
            `Usted ya ha activado el día especial en el grupo ${
                groupWithActivatedDay.group_name
            }. Por favor, espere ${Math.ceil(
                (groupWithActivatedDay.special_day_expiry.getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
            )} días más antes de poder activarlo en otro grupo.`
        );
    }

    const specialDayExpiry = new Date();
    specialDayExpiry.setDate(specialDayExpiry.getDate() + 1);

    const updatedGroup = await supabase.updateTable(
        "premium_groups",
        { special_day_expiry: specialDayExpiry },
        "group_id",
        [groupId]
    );

    if (updatedGroup) {
        return `Día especial activado en este grupo. Los usuarios podrán usar el comando !chat durante las próximas 24 horas.`;
    } else {
        throw new Error(
            "Hubo un error al activar el día especial en este grupo. Por favor, inténtelo de nuevo más tarde."
        );
    }
}

module.exports = {
    activateSpecialDay,
};
