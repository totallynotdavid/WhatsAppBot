#!/bin/bash
sudo apt update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install node

# Install ffmpeg
sudo apt install ffmpeg -y

# Install yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Install ImageMagick
sudo apt install imagemagick -y
sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml

# Install TeXLive
cd /tmp
wget https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
tar -xf install-tl-unx.tar.gz
cd install-tl-*/
sudo perl install-tl --no-interaction
echo 'export PATH="/usr/local/texlive/2022/bin/x86_64-linux:$PATH"' >> ~/.bashrc
source ~/.bashrc
