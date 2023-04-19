#!/bin/bash

# Update package list
sudo apt update -y

# Install Node.js
if ! command -v node &> /dev/null; then
  echo "Node.js is not installed. Installing..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
  source ~/.bashrc
  nvm install node --no-progress
else
  echo "Node.js is already installed. Skipping."
fi

# Install ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "FFmpeg is not installed. Installing..."
  wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
  wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz.md5
  md5sum -c ffmpeg-git-amd64-static.tar.xz.md5 > /dev/null
  tar xvf ffmpeg-git-amd64-static.tar.xz -C /tmp > /dev/null
  FFMPEG_DIR=$(find /tmp -type d -name "ffmpeg-git-*")
  sudo mv $FFMPEG_DIR/ffmpeg $FFMPEG_DIR/ffprobe /usr/local/bin/ > /dev/null
  echo "FFmpeg installed successfully."
else
  echo "FFmpeg is already installed. Skipping."
fi

# Install yt-dlp
if ! command -v yt-dlp &> /dev/null; then
  echo "yt-dlp is not installed. Installing..."
  sudo curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  echo "yt-dlp installed successfully."
else
  echo "yt-dlp is already installed. Skipping."
fi

# Install ImageMagick
if ! command -v convert &> /dev/null; then
  echo "ImageMagick is not installed. Installing..."
  sudo apt install -y imagemagick > /dev/null
  sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml
  echo "ImageMagick installed successfully."
else
  echo "ImageMagick is already installed. Skipping."
fi

# Install TeXLive
if ! command -v pdflatex &> /dev/null; then
  echo "TeXLive is not installed. Installing..."
  cd /tmp
  wget -q --show-progress https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
  tar -xf install-tl-unx.tar.gz > /dev/null
  cd install-tl-*/
  sudo perl install-tl --no-interaction > /dev/null
  echo 'export PATH="/usr/local/texlive/2023/bin/x86_64-linux:$PATH"' >> ~/.bashrc
  source ~/.bashrc
  echo "TeXLive installed successfully."
else
  echo "TeXLive is already installed. Skipping."
fi