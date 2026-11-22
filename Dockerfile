FROM node:24-alpine
WORKDIR /home/node/app
COPY package*.json ./
RUN npm install
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
