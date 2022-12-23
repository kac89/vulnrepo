FROM node:16 AS build

RUN mkdir /app

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --prod


FROM nginx:latest AS ngi
COPY --from=build /app/dist/vulnrepo-app /usr/share/nginx/html
COPY ./nginx.conf  /etc/nginx/conf.d/default.conf
EXPOSE 80

