# Garie sonarqube plugin

<p align="center">
  <p align="center">Tool to extract Sonarqube statistics by tags, and supports CRON jobs.<p>
</p>

**Highlights**

-   Poll for sonarqube statistics and stores the data into InfluxDB
-   View all historic reports.
-   Setup within minutes

## Overview of garie-sonarqube

Garie-sonarqube was developed as a plugin for the [Garie](https://github.com/boyney123/garie) Architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-securityheaders` is a plugin that generates and stores securityheaders data into `InfluxDB`.

`Garie-sonarqube` can also be run outside the `Garie` environment and run as standalone.

If your interested in an out the box solution that supports multiple performance tools like `securityheaders`, `google-speed-insight` and `lighthouse` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-sonarqube` standalone you can find out how below.

## Getting Started

### Prerequisites

-   Docker installed

### Running garie-securityheaders

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone https://github.com/eea/garie-sonarqube.git
```

Next setup you're config. Edit the `config.json` and add websites to the list.

```javascript
{
  "plugins":{
        "sonarqube":{
            "cron": "0 */4 * * *"
        }
    },
  "urls": [
    {
      "url": "https://www.eea.europa.eu/"
    },
    {
      "url": "https://www.eionet.europa.eu/"
    }
  ]
}
```

Once you finished edited your config, lets setup our environment.

```sh
docker-compose up
```

This will build your copy of `garie-sonarqube` and run the application.

On start garie-sonarqube will start to gather statistics for the websites added to the `config.json`.

## config.json

| Property | Type                | Description                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| `plugins.sonarqube.cron`   | `string` (optional) | Cron timer. Supports syntax can be found [here].(https://www.npmjs.com/package/cron) |
| `plugins.sonarqube.retry`   | `object` (optional) | Configuration how to retry the failed tasks |
| `plugins.sonarqube.retry.after`   | `number` (optional, default 30) | Minutes before we retry to execute the tasks |
| `plugins.sonarqube.retry.times`   | `number` (optional, default 3) | How many time to retry to execute the failed tasks |
| `plugins.sonarqube.retry.timeRange`   | `number` (optional, default 360) | Period in minutes to be checked in influx, to know if a task failed |
| `plugins.sonarqube.delete_files_by_type`   | `object` (optional, no default) | Configuration for deletion of custom files. (e.g. mp4 files)  |
| `plugins.sonarqube.delete_files_by_type.type`   | `string` (required for 'delete_files_by_type') | The type / extension of the files we want to delete. (e.g. "mp4"). |
| `plugins.sonarqube.delete_files_by_type.age`   | `number` (required for 'delete_files_by_type') | Maximum age (in days) of the custom files. Any older file will be deleted. |
| `urls`   | `object` (required) | Config for lighthouse. More detail below |

**urls object**

| Property | Type                | Description                         |
| -------- | ------------------- | ----------------------------------- |
| `url`    | `string` (required) | Url to get sonarqube metrics for.   |


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

For more information please go to the [garie-plugin](https://github.com/eea/garie-plugin) repo.


