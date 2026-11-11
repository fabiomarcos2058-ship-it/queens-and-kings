#!/bin/sh
# Muda o número de versão no index.html para o celular baixar o CSS/JS novos.
V=$(date +%s)
sed -i -E "s#(href=\"css/style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(src=\"js/[a-z]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
echo "versão $V"
