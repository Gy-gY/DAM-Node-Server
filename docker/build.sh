#!/bin/bash
#Prepare app
# TODO maybe should prepare app from git clone.
rm -r dam-server || true 
mkdir dam-server

cp -r ../api dam-server
cp -r ../config dam-server
cp -r ../lib dam-server
cp -r ../middlewares dam-server
cp -r ../node_modules dam-server
cp -r ../public dam-server
cp -r ../public-api-services dam-server
cp -r ../routes dam-server
cp -r ../utils dam-server
cp -r ../views dam-server
cp -r ../.babelrc dam-server
cp -r ../app.js dam-server
cp -r ../index.js dam-server
cp -r ../package.json dam-server
cp -r ../README.md dam-server
mkdir dam-server/logs

#Build image
docker build -t dam-app .
