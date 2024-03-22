const getUserInfo = (senderNumber, robotEmoji, paidUsers, premiumGroups) => {
    const userInfo = paidUsers.find(user => user.phone_number === senderNumber);

    if (!userInfo) {
        return `${robotEmoji} No encontramos información de tu suscripción.`;
    }

    const { phone_number, premium_expiry } = userInfo;
    const formattedExpirationDate = new Date(
        premium_expiry
    ).toLocaleDateString();
    const registeredGroups = premiumGroups.filter(
        group => group.contact_number === phone_number
    );

    let message = `${robotEmoji} Información de tu suscripción:\n\n`;
    message += `Número de teléfono: ${phone_number}\n`;
    message += `Fecha de expiración: ${formattedExpirationDate}\n`;
    message += `Grupos registrados:\n`;

    registeredGroups.forEach(group => {
        message += `- ${group.group_id}\n`;
    });

    return message;
};

module.exports = { getUserInfo };
