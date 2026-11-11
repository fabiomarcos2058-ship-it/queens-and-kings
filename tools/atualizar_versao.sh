#!/bin/sh
# Muda o número de versão para o celular baixar o CSS/JS novos.
V=$(date +%s)
echo "$V" > versao.txt
sed -i -E "s#(href=\"css/style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
echo "versão $V"
