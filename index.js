//Defining essential constants
const { Client, LocalAuth, MessageMedia, GroupChat, Contact, Chat, Message } = require('whatsapp-web.js');
const qrcode = require("qrcode-terminal")
const fs = require("fs");
const ytsr = require('ytsr');
const axios = require('axios').default;
const fetch = require('node-fetch');
const SpotifyWebApi = require('spotify-web-api-node');
const { spotifyToken, YT_KEY } = require("./config")

// retrieve access token from spotify api with cliend id and client secret
const spotifyApi = new SpotifyWebApi({
    clientId: 'b574eae64a3548998804c5fc3c41af76',
    clientSecret: '8974b3c0231149acb703d24d27e30eb8',
    redirectUri: 'http://localhost:3000'
});

// Retrieve an access token
spotifyApi.clientCredentialsGrant()
  .then(function (data) {
      console.log('The access token expires in ' + data.body['expires_in']);
      // console.log('The access token is ' + data.body['access_token']);
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
  }, function (err) {
      console.log('Something went wrong when retrieving an access token', err);
  });

// run timer to refresh access token every 30 minutes
setInterval(async () => {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body['access_token']);
}, 1000 * 60 * 30);

// define access token from spotify api
spotifyApi.setAccessToken(spotifyToken);

const client = new Client({
  authStrategy: new LocalAuth()
  // authStrategy: new LocalAuth(),puppeteer: { headless: true, executablePath: './node_modules/puppeteer/.local-chromium/linux-1022525/chrome-linux/chrome'} 
  // Use this if you are using puppeteer on a linux machine
}); 

client.on('qr', qr => {
  qrcode.generate(qr, {small: true});
});

client.on('auth_failure', message => {
  console.error('Error de autenticación', message);
})

client.on('ready', () => {
    console.log('Estamos listos, ¡el bot está en linea!');
});

client.on('message_create', async message => {

  const chat = await message.getChat();
  const prefix = '!';       // Prefix for commands on groups
  const prefix_admin = '>'; // Prefix for admin commands on groups

  if (message.body.startsWith(prefix_admin)) {
    console.log('Comando de administrador detectado');
    console.log(message);
    const author = message.id.participant;
    if (author === '51943858416@c.us' || author === '51948394155@c.us') {
      if (chat.isGroup) {
        if (message.body === '>todos') {
          let og = await message.getQuotedMessage();
          const chat = await message.getChat();
          console.log(`Se ha mencionado a todos en el chat ${chat.name}`);
          let text = "";
          let mentions = [];
      
          for (let participant of chat.participants) {
              const contact = await client.getContactById(
                  participant.id._serialized
              );
              mentions.push(contact);
              text += `@${participant.id.user} `;
          }
      
          try {
              if(message.hasQuotedMsg){
                  og.reply(text, null, { mentions });
              }
              else{
                  chat.sendMessage(text,{mentions})
              }
          } catch (err) {
              console.log(err);
          }
          console.log('Ha usado el comando >todos y tiene permisos para hacerlo');
        }
      }
    }
  }
  
  if (message.body.startsWith(prefix)) {

    if (message.body === '!ayuda') {
      // send a private message to the user who sent "!ayuda"
      //if (chat.isGroup) {
        const number = message.from;
        console.log('El usuario ' + number + ' ha solicitado ayuda');
        client.sendMessage(number, '🤖 Hola, este es un mensaje automático de ayuda. Los comandos disponibles son:\n\n ```!sticker```: Transforma una imagen, gif o video a sticker de WhatsApp\n```!cae```: Retorna enlaces del CAE, para mayor información use ```!cae ayuda```\n```!yt <término>```: Retorna el primer resultado para el término de búsqueda en Youtube\n```!wiki <término>```: Retorna una definición corta del término de búsqueda en Wikipedia\n```!spot <término>```: Retorna un audio con el primer resultado de la búsqueda en Spotify');
        message.react("✅");
      //}
    }

    if (message.body === '!sticker') {
      let chat = await message.getChat();
  
      if (message.hasQuotedMsg) {
        const quoted = await message.getQuotedMessage();
        if (quoted.hasMedia) {
          try {
            const sticker = await quoted.downloadMedia();
  
            chat.sendMessage(sticker, {
              sendMediaAsSticker: true,
              stickerName: "Aquí está tu sticker, mi kong",
              stickerAuthor: "davibot",
            });
            message.react("✅");
          } catch (e) {
            message.reply(
              "Hubo un error al tratar de convertir esta imagen en sticker."
            );
            message.react("❌");
          }
        }
      } else if (message.hasMedia) {
        try {
          const sticker = await message.downloadMedia();
  
          chat.sendMessage(sticker, {
            sendMediaAsSticker: true,
            stickerName: "Aquí está tu sticker, mi kong",
            stickerAuthor: "davibot",
          });
          message.react("✅");
        } catch (e) {
          message.reply(
            "Hubo un error al tratar de convertir esta imagen en sticker."
          );
          message.react("❌");
        }
      } else {
        message.reply(
          "Debes adjuntar la imagen a la que quieres convertir en sticker."
        );
        message.react("⚠️");
      }
    }

    // download image from url and send as sticker to group
    if (message.body.startsWith("!url ")) {
      console.log("url command");
      const url = message.body.split(" ")[1];
      const chat = await message.getChat();
      const media = await MessageMedia.fromUrl(url);

      // try and catch to handle errors
      try {
        await chat.sendMessage(media, {
          sendMediaAsSticker: true,
          stickerName: "Aquí está tu sticker, mi kong",
          stickerAuthor: "davibot",
        });
        message.react("✅");
      } catch (e) {
        message.reply(
          "Hubo un error al tratar de convertir esta imagen en sticker."
        );
      }
    }
  
    if (message.body.startsWith("!cae")) {
      const query = message.body.split(" ").slice(1).join(" ");
      if (message.body === "!cae") {
        message.reply('🤖 linktr.ee/caefisica');
        message.react("🎉");
      }
      else if (query === 'bib') {
        message.reply('🤖 caefis.netlify.app/biblioteca');
        message.react("🎉");
      }
      else if (query === 'cal') {
        message.reply('_Curso: Cálculo_\n  1: https://caefis.netlify.app/guias/pregrado/1/cbo104/\n  2: https://caefis.netlify.app/guias/pregrado/2/cbo204/');
        message.react("🎉");
      }
      else if (query === 'fg') {
        message.reply('_Curso: Física General_\n  1: https://caefis.netlify.app/guias/pregrado/1/cbe013/\n  2: https://caefis.netlify.app/guias/pregrado/2/cbo207/');
        message.react("🎉");
      }
      else if (query === 'ayuda') {
        message.reply('🤖 ```Comandos disponibles:```\n\n```!cae```: Retorna enlace a Linktree\n```!cae bib```: Retorn enlace a la Biblioteca\n```!cae cal```: Retorna enlaces a los cursos de Cálculo\n```!cae fg```: Retorn enlaces a los cursos de Física General\n```!cae ayuda```: Retorna esta lista de comandos');
        message.react("🎉");
      }

      else {
        return
      }
    }
  
    if (message.body.startsWith("!yt ")) {
      const query = message.body.split(" ").slice(1).join(" ");
      const searchResults = await ytsr(query);
      const firstResult = searchResults.items[0];
      console.log(firstResult);

      // check if the type is video
      if (firstResult.type === "video") {
        // send the video url to the chat
        const media = await MessageMedia.fromUrl(firstResult.bestThumbnail.url);
  
        // Mention the user who sent the message
        const contact = await message.getContact();
        const name = contact.pushname;
        
        if (media) {
          // create a new message as a reply to the current one with image and caption
          await client.sendMessage(message.from, media, {
            caption: `🤖 Resultado de búsqueda para: ${query}\n\n🎬 ${firstResult.title}\n👤 ${firstResult.name}\n🔗 ${firstResult.url}`,
          });
          // await message.reply(media, contact, { caption: `🤖 *${name}* ha solicitado el siguiente video:\n\n${firstResult.title}: ${firstResult.url}` });
          message.react("✅");
        }
        // send profile picture from channel if it is first result
      } else if (firstResult.type === "channel") {
          const media = await MessageMedia.fromUrl(firstResult.bestAvatar.url, { unsafeMime: true });
          await client.sendMessage(message.from, media, {
            caption: `🤖 Resultado de búsqueda para: ${query}\n\n👤 ${firstResult.name}\n🔗 ${firstResult.url}`,
          });
          // await message.reply(media, contact, { caption: `🤖 *${name}* ha solicitado el siguiente video:\n\n${firstResult.title}: ${firstResult.url}` });
          message.react("✅");
      }
      else {
        await message.reply(
          `El primer resultado no tiene una imagen asociada.`
        );
      }
    }
  
    if (message.body.startsWith("!wiki ")) {
      const query = message.body.split(" ").slice(1).join(" ");
      const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${query}`;
      const res = await fetch(url);
      const data = await res.json();
  
      if (data.type === "disambiguation") {
        const disambiguation = data.content_urls.desktop.page;
        const contact = await message.getContact();
        const name = contact.pushname;
        message.reply(`🤖 ${name}, tu búsqueda dió resultados ambiguos, puedes verlos aquí: ${disambiguation}`);
        message.react("⚠️");
      } else {
        message.reply(`🤖 *${data.title}*: ${data.extract}`);
        message.react("✅");
      }
    }
  
    // get information about song from spotify
    if (message.body.startsWith("!spot ")) {
      console.log("spotify called");
      const query = message.body.split(" ").slice(1).join(" ");
      const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${spotifyApi._credentials.accessToken}`,
        },
      });
      // console.log(res);
      const data = await res.json();
      // console.log(data);
      const song = data.tracks.items[0];
      // console.log(song);
  
      if ( song.preview_url === null ) {
        message.reply(`🤖 No se encontró una preview de la canción *${song.name}* de *${song.artists[0].name}*`);
        message.react("⚠️");
      } else {
        // download and save audio as 'audio.mp3' with requests
      const audio2 = await axios({
        method: 'get',
        url: song.preview_url,
        responseType: 'stream'
      });
  
      // wait for audio to be downloaded
      audio2.data.pipe(fs.createWriteStream('audio.mp3'));
      audio2.data.on('end', () => {
        console.log('audio downloaded!');
        const media = MessageMedia.fromFilePath("./audio.mp3");
        client.sendMessage(message.from, media, { sendAudioAsVoice: true });
        message.react("✅");
      });
      }
      
    }

    else {
      return
    }

  }

  if (message.body.startsWith(">")) {
    
    if ( chat.isGroup ) {

      console.log(`[${chat.name}] ${message.author} : ${message.body}`);
  
      if (message.body === '>info' ) {
        let chat = await message.getChat();
        message.reply(`*Información de ${chat.name}*\nDescripción: ${chat.description}\nCreado el: ${chat.createdAt.toString()}\nCreado por: ${chat.owner.user}\nParticipantes: ${chat.participants.length}`);
        message.react("✅");
      }
      /*
      if (message.body == '>everyone' && message.fromMe) {
        let og = await message.getQuotedMessage();
        const chat = await message.getChat();
        console.log(`Se ha mencionado a todos en el chat ${chat.name}`);
        let text = "";
        let mentions = [];
    
        for (let participant of chat.participants) {
            const contact = await client.getContactById(
                participant.id._serialized
            );
            mentions.push(contact);
            text += `@${participant.id.user} `;
        }
    
        try {
            if(message.hasQuotedMsg){
                og.reply(text, null, { mentions });
            }
            else{
                chat.sendMessage(text,{mentions})
            }
        } catch (err) {
            console.log(err);
        }
      }

      else if (message.body == '>everyone' && message.fromMe) {
        let og = await message.getQuotedMessage();
        const chat = await message.getChat();
        console.log(`Se ha mencionado a todos en el chat ${chat.name}`);
        let text = "";
        let mentions = [];
    
        for (let participant of chat.participants) {
            const contact = await client.getContactById(
                participant.id._serialized
            );
            mentions.push(contact);
            text += `@${participant.id.user} `;
        }
    
        try {
            if(message.hasQuotedMsg){
                og.reply(text, null, { mentions });
            }
            else{
                chat.sendMessage(text,{mentions})
            }
        } catch (err) {
            console.log(err);
        }
      }
      */
  
      else {
        return
      }
  
    }

    else {
      return
    }

  }

  if (message.body.startsWith ("-")) {
    // youtube command
    if (message.body.startsWith("-yt ")) {
      // input from user is a link to a youtube channel
      try {
        if (message.body.includes("youtube.com/channel/")) {
          const url = message.body.split(" ").slice(1).join(" ");
          // save only the channel id
          const channelId = url.split("channel/")[1];
          // save channel id on json file
          // check if id is already saved
          if (fs.existsSync("./channels.json")) {
            // read file
            const data = fs.readFileSync("./channels.json");
            // parse data
            const channels = JSON.parse(data);
            // check if id is already saved
            if (channels.includes(channelId)) {
              message.reply(
                `🤖 El canal ya se encuentra en la lista de canales a seguir.`
              );
              message.react("⚠️");
            } else {
              // if id is not saved, save it
              channels.push(channelId);
              fs.writeFileSync("./channels.json", JSON.stringify(channels));
              message.reply(`🤖 Canal agregado a la lista de canales a seguir.`);
              message.react("✅");
            }
          } else {
            // if file does not exist, create it and save id
            const channels = [];
            channels.push(channelId);
            fs.writeFileSync("./channels.json", JSON.stringify(channels));
            message.reply(`🤖 Canal agregado a la lista de canales a seguir.`);
            message.react("✅");
          }
          
        }
        // input from user is a youtube link with usernamew
        else if (message.body.includes("youtube.com/user/")) {
          const url = message.body.split(" ").slice(1).join(" ");
          // save only the username
          const username = url.split("user/")[1];
          // save username on json file
          // check if username is already saved
          if (fs.existsSync("./users.json")) {
            // read file
            const data = fs.readFileSync("./users.json");
            // parse data
            const users = JSON.parse(data);
            // check if username is already saved
            if (users.includes(username)) {
              message.reply(
                `🤖 El canal ya se encuentra en la lista de canales a seguir.`
              );
              message.react("⚠️");
            } else {
              // if username is not saved, save it
              users.push(username);
              fs.writeFileSync("./users.json", JSON.stringify(users));
              message.reply(`🤖 Canal agregado a la lista de canales a seguir.`);
              message.react("✅");
            }
          } else {
            // if file does not exist, create it and save username
            const users = [];
            users.push(username);
            fs.writeFileSync("./users.json", JSON.stringify(users));
            message.reply(`🤖 Canal agregado a la lista de canales a seguir.`);
            message.react("✅");
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  // console.log all messages
  // console.log(`${message.author} sent a message to ${chat.name}(${message.from}): ${message.body}`);

  const group = '120363041096593429@g.us';

  setInterval(async function () {
    // client.sendMessage(robert, 'Hola, soy un bot');
    // send a message when a new video from the list of channels on json file
    // is uploaded
    console.log("Checking for new videos...");
    if (fs.existsSync("./channels.json")) {
      const rawdata = fs.readFileSync("./channels.json");
      // get channels from json file and use youtube api to get latest video
      const channels = JSON.parse(rawdata);
      try {
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&maxResults=1&order=date&type=video&key=${YT_KEY}`
          );
          const data = await res.json();
          const videoId = data.items[0].id.videoId;
          const videoTitle = data.items[0].snippet.title;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          // channel name
          const channelName = data.items[0].snippet.channelTitle;
          // check if video is already in json file
          if (fs.existsSync("./videos.json")) {
            const rawdata = fs.readFileSync("./videos.json");
            const videos = JSON.parse(rawdata);
            if (!videos.includes(videoId)) {
              // send message to group with link to video
              client.sendMessage(group, `🤖 Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
              console.log(`Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
              // add video to json file
              try {
                videos.push(videoId);
                fs.writeFileSync("./videos.json", JSON.stringify(videos));
              } catch (err) {
                console.log(err);
              }
            }
          } else {
            // create json file and add video to it
            const videos = [videoId];
            const json = JSON.stringify(videos, null, 2);
            fs.writeFileSync("./videos.json", json, "utf8");
            // send message to group with link to video
            client.sendMessage(group, `🤖 Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
            console.log(`Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    if (fs.existsSync("./users.json")) {
      const rawdata = fs.readFileSync("./users.json");
      // get channels from json file and use youtube api to get latest video
      const users = JSON.parse(rawdata);
      try {
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${user}&key=${YT_KEY}`
          );
          const data = await res.json();
          const videoId = data.items[0].id.videoId;
          const videoTitle = data.items[0].snippet.title;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          // channel name
          const channelName = data.items[0].snippet.channelTitle;
          // check if video is already in json file
          if (fs.existsSync("./videos.json")) {
            const rawdata = fs.readFileSync("./videos.json");
            const videos = JSON.parse(rawdata);
            if (!videos.includes(videoId)) {
              // send message to group with link to video
              client.sendMessage(group, `🤖 Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
              console.log(`Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
              // add video to json file
              try {
                videos.push(videoId);
                fs.writeFileSync("./videos.json", JSON.stringify(videos));
              } catch (err) {
                console.log(err);
              }
            }
          } else {
            // create json file and add video to it
            const videos = [videoId];
            const json = JSON.stringify(videos, null, 2);
            fs.writeFileSync("./videos.json", json, "utf8");
            // send message to group with link to video
            client.sendMessage(group, `🤖 Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
            console.log(`Nuevo video de ${channelName}: ${videoTitle} ${videoUrl}`);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  }, 600000);



});

client.initialize();