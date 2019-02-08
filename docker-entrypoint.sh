#!/bin/sh
set -e


if [ -z "$SONARQUBE_TOKEN" ]; then
        echo "Please provide the sonarqube keys in the UPTIME_ROBOT_KEYS variable"
        exit 1
fi


if [ -z "$SONARQUBE_API_URL" ]; then
        echo "SONARQUBE_API_URL not found"
        exit 1
fi




if [ -n "$CONFIG" ]; then
	echo "Found configuration variable, will write it to the /usr/src/garie-sonarqube/config.json"
	echo "$CONFIG" > /usr/src/garie-sonarqube/config.json
fi

exec "$@"
