# WhatsApp web

Este bot está diseñado para funcionar en la plataforma WhatsApp Web, permitiendo a los usuarios interactuar con él mediante comandos enviados a través del chat.

## Funciones

- Convierte imágenes y vídeos en pegatinas
- Busca y reproduce canciones de Spotify
- Obtén información de Wikipedia
- Obtén imágenes de Reddit
- Busca y reproduce vídeos de YouTube
- Menciona a todos los miembros del grupo

## Prerrequisitos

- Node.js
- ffmpeg
	```
	sudo apt install ffmpeg
	```
- yt-dlp
	```bash
	sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
	sudo chmod a+rx /usr/local/bin/yt-dlp  # Make executable
	```
- ImageMagick
	```bash
	sudo apt install imagemagick
	```
- TeXLive 
	```bash
	cd /tmp
	wget https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
	tar -xf install-tl-unx.tar.gz
	cd install-tl-*/
	sudo perl install-tl --no-interaction
	echo 'export PATH="/usr/local/texlive/2022/bin/x86_64-linux:$PATH"' >> ~/.bashrc
	source ~/.bashrc
	```

## Instalación

1. Clonar el repositorio

   ```
   git clone https://github.com/<username>/Bot-for-WhatsApp-Web.git
   ```

2. Crear un `.env` con las siguientes variables:

   - `spotifyClientId`
   - `spotifyClientSecret`
   - `youtubeKey`

3. Crear un archivo llamado `administrators.json` dentro de la carpeta fixedData. Sugiero que tenga la siguiente estructura:

   ```
   [
      {
         "name": "Nombre",
         "phone": "XXXXXXXXXXX@c.us"
      },
      {
         "name": "Nombre",
         "phone": "XXXXXXXXXXX@c.us"
      }
   ]
   ```

4. Instalar las dependencias

   ```
   npm install
   ```

5. Inicia el bot

   ```
   node index.js
   ```

6. Aplica estas [correcciones](https://github.com/pedroslopez/whatsapp-web.js/issues/2066#issuecomment-1470534717)

## Uso

El Bot funciona interpretando los comandos que empiezan por `!` o `@`.

### Comandos disponibles

- `!help` - Muestra una lista de los comandos disponibles
- `!sticker` - Convierte la imagen o el vídeo adjuntos en una pegatina
- `!url` - Convierte una imagen o un vídeo de una URL en una pegatina
- `!spot <nombre_canción>` - Busca y reproduce una canción en Spotify
- `!cae` - Muestra un mensaje sobre un meme popular
- `!fromis` - Obtiene una imagen del subreddit "Fromis"
- `!w <consulta_búsqueda>` - Busca un artículo en Wikipedia
- `!yt <search_query>` - Busca un vídeo en YouTube
- `!play <youtube_url> [tiempo_de_inicio] [tiempo_final]` - Descarga y escucha una video de Youtube

### Comandos para administradores

Los siguientes comandos sólo están disponibles para los usuarios que han sido añadidos al archivo `administrators.json`.

- `@todos` - Menciona a todos los miembros del grupo.
