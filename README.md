# WhatsAppBot

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

	```bash
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
	```

- ffmpeg

	```bash
	sudo apt install ffmpeg
	```

- yt-dlp

	```bash
	sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
	sudo chmod a+rx /usr/local/bin/yt-dlp  # Make executable
	```

- [ImageMagick](https://stackoverflow.com/questions/52998331/imagemagick-security-policy-pdf-blocking-conversion)

	```bash
	sudo apt install imagemagick -y
	```

- TeXLive 

	```bash
	cd /tmp
	wget https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
	tar -xf install-tl-unx.tar.gz
	cd install-tl-*/
	sudo perl install-tl --no-interaction
	echo 'export PATH="/usr/local/texlive/2023/bin/x86_64-linux:$PATH"' >> ~/.bashrc
	source ~/.bashrc
	pdflatex --version
	```

## Instalación

1. Clonar el repositorio

   ```bash
   git clone https://github.com/totallynotdavid/WhatsAppBot
   ```

2. Crear un `.env` y agregar las siguientes variables:

	- `spotify_client_id`
	- `spotify_client_secret`
	- `youtube_api_key`
	- `supabase_api_key`
	- `supabase_base_url`
	- `folder_id`

3. Instalar las dependencias:

	```bash
	npm install
	```

4. Aplica estas correcciones: [1](https://github.com/pedroslopez/whatsapp-web.js/issues/2066#issuecomment-1470534717), [2](https://github.com/pedroslopez/whatsapp-web.js/pull/2087/files). También:

	```bash
	npm i github:pedroslopez/whatsapp-web.js#fix-buttons-list
	```

5. Necesitas añadir tus credenciales de Amazon. En Linux, Unix, y macOS: `~/.aws/credentials`. Para Windows: `\Users\USUARIO\.aws\credentials`.

	```bash
	[default]
	aws_access_key_id =
	aws_secret_access_key =
	```

6. Inicia el bot por primera vez:

	```bash
	node index.js
	```

7. Usar pm2 para mantener el bot funcionando continuamente:
	 ```
	 pm2 start index.js --cron-restart="0 * * * *"
	 ```

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
- `!lx <código de LaTeX>` - Transforma código LaTeX en imagen
- `!sh <doi>` - Obten el PDF de un artículo científico

### Comandos para administradores

- `@todos` - Menciona a todos los miembros del grupo
- `@ban` - Elimina a un miembro del grupo
