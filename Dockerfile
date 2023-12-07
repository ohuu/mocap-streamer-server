FROM node:18

COPY . .
RUN npm install
RUN npm run build

EXPOSE 8000

CMD [ "node", "./dist/index.js" ]