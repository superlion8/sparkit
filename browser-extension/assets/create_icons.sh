#!/bin/bash
# 使用 ImageMagick 创建图标（如果已安装）
if command -v convert &> /dev/null; then
    convert -size 16x16 xc:#667eea -fill white -gravity center -pointsize 12 -annotate +0+0 "M" icon16.png
    convert -size 48x48 xc:#667eea -fill white -gravity center -pointsize 32 -annotate +0+0 "M" icon48.png
    convert -size 128x128 xc:#667eea -fill white -gravity center -pointsize 80 -annotate +0+0 "M" icon128.png
    echo "Icons created successfully"
else
    echo "ImageMagick not found. Please install it or use the HTML method."
fi
