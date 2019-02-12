
# Garie plugin to extract uptime statistics from https://sonarqube.com/

Can have multiple accounts/keys. Will extract the uptime for the last number of days ( configured in environment ).


## Variables

- UPTIME_ROBOT_KEYS - List of keys, separated by space 
- UPTIME_API_URL - Uptimerobot api url
- UPTIME_INTERVAL_DAYS - Interval to check the monitors on


## Usage

Use example.env as a template for .env file with the correct values.

cp example.env .env


### For development

docker-compose -f docker-compose-dev.yml build
docker-compose -f docker-compose-dev.yml up
docker exec -it garie-sonarqube_garie-plugin_1 bash

root@6642eff38f49:/usr/src/garie-sonarqube# cd src
root@6642eff38f49:/usr/src/garie-sonarqube/src# npm start


