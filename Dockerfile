FROM node:8.10.0

RUN mkdir -p /usr/src/garie-sonarqube
RUN mkdir -p /usr/src/garie-sonarqube/reports

WORKDIR /usr/src/garie-sonarqube

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-sonarqube/reports"]

ENTRYPOINT ["/usr/src/garie-sonarqube/docker-entrypoint.sh"]

CMD ["npm", "start"]
