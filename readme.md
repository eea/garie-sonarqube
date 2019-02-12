
# Garie plugin to extract Sonarqube statistics by tags



## Variables

- SONARQUBE_TOKEN - used for authentification
- SONARQUBE_API_URL - SonarqubeUrl


## Usage

Use example.env as a template for .env file with the correct values.

cp example.env .env

The results that will be added to the database are an agregation of all url-related sonarqube projects:

```
      stats = {
        'bugs'  // total number of bugs
        'reliability_rating' // bug rating - we take the worst from all sonarqube projects -0-25-50-75-100
        'vulnerabilities' // sum of vulnerabilities
        'security_rating' // security rating - we take the worst from all sonarqube projects -0-25-50-75-100
        'code_smells' // sum of code smells
        'sqale_rating' // code smell rating - we take the worst from all sonarqube projects -0-25-50-75-100
        'lines_to_cover' // sum of lines that should be covered with tests
        'uncovered_lines' // sum of lines that are not covered with tests
        'duplicated_lines' // sum of lines that are duplicates
        'lines' // sum of lines 
        'non_duplication_rating' // calculated from total values on all projects
        'coverage_rating'  // calculated from total values on all projects
      };

```


We are extracting the projects that have the tag `master` and the tag that is created from the url by following the rules:
1. all lowercase
2. No underscores (_)
3. Slash (/) becomes line -
4. If url ends with /, it is deleted





### For development

docker-compose -f docker-compose-dev.yml build
docker-compose -f docker-compose-dev.yml up
docker exec -it garie-sonarqube_garie-plugin_1 bash

root@6642eff38f49:/usr/src/garie-sonarqube# cd src
root@6642eff38f49:/usr/src/garie-sonarqube/src# npm start


