FROM node

#安装dockerize
# wget https://github.com/jwilder/dockerize/releases/download/v0.4.0/dockerize-linux-amd64-v0.4.0.tar
COPY dockerize-linux-amd64-v0.4.0.tar .
RUN tar -C /usr/local/bin -xvf dockerize-linux-amd64-v0.4.0.tar

EXPOSE 8088
RUN mkdir /home/node/dam-server
WORKDIR /home/node/dam-server

#COPY web app
COPY dam-server /home/node/dam-server

RUN chown -R node /home/node/dam-server 

USER node

#ENTRYPOINT 
CMD dockerize -template /home/node/dam-server/config/index.js.tmpl:/home/node/dam-server/config/index.js \
-template /home/node/dam-server/config/micro-services.js.tmpl:/home/node/dam-server/config/micro-services.js \
npm start