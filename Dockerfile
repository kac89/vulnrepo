FROM node:18 AS build

RUN mkdir /app

WORKDIR /app
COPY . .
RUN npm i --force
RUN npm run build -- -c production


FROM nginx:latest AS ngi
COPY --from=build /app/dist/vulnrepo-app /usr/share/nginx/html
COPY ./nginx.conf  /etc/nginx/conf.d/default.conf
EXPOSE 80

