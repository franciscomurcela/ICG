# Dependências do projeto para execução em ambiente remoto

## Dependências principais
three                # Biblioteca principal para renderização 3D
webpack              # Empacotador de módulos para o projeto
webpack-cli          # Interface de linha de comando para o Webpack
webpack-dev-server   # Servidor de desenvolvimento para Webpack

## Loaders e plugins para Webpack
babel-loader         # Transpila o código JavaScript usando Babel
@babel/core          # Núcleo do Babel para transpilar o código
@babel/preset-env    # Preset do Babel para compatibilidade com navegadores
style-loader         # Carrega estilos CSS no projeto
css-loader           # Processa arquivos CSS
file-loader          # Carrega arquivos de imagem e outros recursos
html-webpack-plugin  # Gera o arquivo HTML para o projeto

## Dependências opcionais (caso necessário)
three/examples/jsm/loaders/EXRLoader.js  # Loader para arquivos EXR (se usado no projeto)

## Dependências de desenvolvimento
eslint              # Ferramenta para análise estática de código
eslint-plugin-import # Plugin para ESLint para verificar importações