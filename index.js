//Defining essential constants
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require("qrcode-terminal")
const ms = require("./functions/timeConvert");

//Requiring bot information and creator information
const { mongoURI, PREFIX } = require("./config")

//Requiring mongoose for database creation/storage of information
const mongoose = require("mongoose");
const userDB = require("./models/user");

//Authenticating with mongoose
try {

    mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Conexión exitosa a la base de datos');
  }
  catch(e) { console.log(e) 
}

const client = new Client({
  authStrategy: new LocalAuth()
}); 

client.on('qr', qr => {
  qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Estamos listos, ¡el bot está en linea!');
});

client.on('message', message => {
  
  if(message.body === '!bing') {
		message.reply('bang');
	}

});

client.on('message', async message => {


  if(message.hasMedia && message.body === '!sticker'){
    const chat= await message.getChat();
    const media = await message.downloadMedia();
    chat.sendMessage(media, {sendMediaAsSticker: true, stickerAuthor: 'David', stickerName: 'Gyuri Gang'  }, );
  }

});

client.on('message', async message => {
  if(message.body.toLowerCase() === '!gyuri') {
    const media = MessageMedia.fromFilePath('./gyu.png');
    message.reply(media, {caption: 'this is my caption'});
  }
});

client.on('message', async (message) => {

  //Help command
  if(message.body.toLowerCase() === `${PREFIX}ayuda`) { 
    return client.sendMessage(message.from, `*Menú de ayuda*\n\n1) Cómo guardar tus recordatorios. ⏰\n\nPara seleccionar una opción, use: \`\`\`${PREFIX}ayuda 1\`\`\``);
  }

  //Help comman: Option 1
  if(message.body.toLowerCase() === `${PREFIX}ayuda 1`) {
    return client.sendMessage(message.from, `*Ayuda*: _Recordatorios_ ⏰\n*Uso:* \`\`\`${PREFIX}set <tiempo> <qué quieres recordar>\`\`\``);
  }

  //set reminder command
  if(message.body.startsWith(`${PREFIX}set`)) {

    try { 
      let removePrefix = message.body.replace(`${PREFIX}set`, "");

      //get reminder time
      let setDays = message.body.slice(4, 7);
      const t = setDays.split(" ")[0];

      //test it for milliseconds and its length more than 3, to avoid setting time like: 123d OR 123m or any 3 digit time period
      var match = /^(-?(?:\d+)?\.?\d+) *(ms)?$/i.exec(t);

      if(match) return client.sendMessage(message.from, `\`\`\`El tiempo señalado es incorrecto ❌ \n\nAsegúrate de usar: \n\nset 5<d _o_ h _o_ m> \n\ndonde 'd' son días, \n'm' minutos,\n'h' horas.\n\nAsegúrate que los valores proporcionados se encuentre entre 0 & 99\`\`\``)

      if(t.length > 3) return client.sendMessage(message.from, `\`\`\`El tiempo señalado es incorrecto ❌ \n\nAsegúrate de usar: \n\nset 5<d _o_ h _o_ m> \n\ndonde 'd' son días, \n'm' minutos,\n'h' horas.\n\nAsegúrate que los valores proporcionados se encuentre entre 0 & 99\`\`\``)

      //assigning variable to reminder message
      let setReminder = removePrefix.slice(4);

      //get user contact
      let contact = await message.getContact();

      //MongoDB CheckPoint
      await userDB.findOne(
        {
            User: `${contact.number}`
        }, 
        
        async(err, data) => {
            if(err) throw err;
            if(data) {
                //Reminder defaults to null. If it is null then do the following else return with message to avoid over writing of data.
                if(data.Reminder === null || data.Reminder === undefined) {
                  data.Reminder = setReminder;
                  data.save();
                  client.sendMessage(message.from, `Hecho 👌 Te recordaré después de ${t} que: \n\n\`\`\`${setReminder}\`\`\``)
                }
                
                else { 
                  return client.sendMessage(message.from, "\`\`\`Oh, no ❌\n\n¡Ya tienes un recordatorio!\`\`\`")
                }
            }

            //If no data is found for the user, Create one.
            else if(!data) {
              const newData = new userDB({
                  User: `${contact.number}`,
                  Reminder: setReminder
              });
              newData.save();
              client.sendMessage(message.from, `Hecho 👌 Te recordaré después de ${t} que: \n\n\`\`\`${setReminder}\`\`\``)
            }
        }

      );

      //SetTimeout function, for each user to actually remind them. :/
      setTimeout(async() => {
        await userDB.findOne({
          User: `${contact.number}`
        }, 
        
        async(err, data) => {
          if(err) throw err;
          if(data) {
            let reminderInfo = data.Reminder;
            let number = `${data.User}@c.us`;
            return client.sendMessage(number, `_Recordatorio_ 🔔:\n\n\`\`\`${reminderInfo}\`\`\``);
          }
        });
        
        //Once reminded, Delete the data from the database to decrease storage usage and well to protect their privacy! :D
        await userDB.findOne(
          {
            User: `${contact.number}`
          },
        
          async(err, data) => {
            if(data) {
              await userDB.findOneAndDelete({ User: `${contact.number}` })
            }
          }
        )

      }, ms(t))

      } 
      catch (e) 
      { 
        console.log(e); 
        client.sendMessage(message.from, `\`\`\`El tiempo provisto es incorrecto ❌\`\`\``) 
    }

  }

})

client.initialize();