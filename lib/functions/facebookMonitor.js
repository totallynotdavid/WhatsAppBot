const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { getLatestPost } = require('../../commands/apiFetchFacebookPosts');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const facebookId = process.env.facebookId;
const remoteNumber = process.env.adminNumber;
const lastPostIdFile = 'last_post_id.txt';

// Read the last post ID from the file if it exists
let lastPostId = null;
if (fs.existsSync(lastPostIdFile)) {
  lastPostId = fs.readFileSync(lastPostIdFile, 'utf-8');
	console.log('We have a last post ID:', lastPostId);
} else {
	console.log('No last post ID found, it should be created after the first check');
}

function sendWhatsAppMessage(client, post, remoteId) {
  const postDate = new Date(post.created_time);

  const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Lima',
		timeZoneName: 'short',
  });

  const formattedDate = dateFormatter.format(postDate);

  const facebookPostUpdate = `[*${formattedDate}*] Nueva publicación en Facebook: https://www.facebook.com/${post.id}`;

  if (post._data.attachments && post._data.attachments.data.length > 0) {
    const attachment = post._data.attachments.data[0].media.image.src;
    sendMessageWithImage(client, attachment, remoteId, facebookPostUpdate);
  } else {
    client.sendMessage(remoteId, facebookPostUpdate);
  }
}

async function sendMessageWithImage(client, url, remoteId, caption) {
  try {
    const media = await MessageMedia.fromUrl(url);
    await client.sendMessage(remoteId, media, { caption });
  } catch (error) {
    console.error('Error sending message with image:', error);
  }
}

async function checkForNewPosts(client) {
  const latestPost = await getLatestPost(facebookId);

  if (latestPost && (!lastPostId || latestPost.id !== lastPostId)) {
    lastPostId = latestPost._data.id;

    // Save the last post ID to the file
    fs.writeFileSync(lastPostIdFile, lastPostId, 'utf-8');

    const remoteId = remoteNumber.substring(1) + '@c.us';
    sendWhatsAppMessage(client, latestPost, remoteId);
  }
	//console.log('We have finished checking for new posts')
}

function monitorFacebookPage(client, checkInterval) {
  // Read the last post ID from the file if it exists
  if (fs.existsSync(lastPostIdFile)) {
    lastPostId = fs.readFileSync(lastPostIdFile, 'utf-8');
  }

  // Call checkForNewPosts at the specified interval
  setInterval(() => checkForNewPosts(client), checkInterval);
}

module.exports = { monitorFacebookPage };