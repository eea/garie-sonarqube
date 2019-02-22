const garie_plugin = require('garie-plugin');
const path = require('path');
const fs = require('fs-extra');
const dateFormat = require('dateformat');
const config = require('../config');
const request = require('request-promise');
const express = require('express');
const serveIndex = require('serve-index');
const urlparser = require('url');


function getTag(url) {

  var urlObject = urlparser.parse(url);


  var tag = (urlObject.hostname + urlObject.path.replace(/\//g, "-")).toLowerCase();

  tag = tag.replace(/_/g, '');

  if (tag.substring(tag.length - 1, tag.length) == '-') {
    tag = tag.substring(0, tag.length - 1);
  }
  console.log(` Url ${url} has tag ${tag}`);

  return tag;
}



const getProjectsByTag = async (tag, reportDir) => {


  return new Promise(async (resolve, reject) => {
    try {

      const sonarqubeApi = process.env.SONARQUBE_API_URL + "/api/components/search_projects";
      var headers;

      if (process.env.SONARQUBE_TOKEN != null && process.env.SONARQUBE_TOKEN != "") {
        auth = "Basic " + new Buffer(process.env.SONARQUBE_TOKEN + ":").toString("base64");
        headers = {
          "Authorization": auth
        }
      }

      console.log(`tag is ${tag}`);
      data = await request({
        method: 'GET',
        uri: sonarqubeApi,
        qs: {
          'filter': `tags = ${tag}`,
          'ps': 500
        },
        json: true,
        headers: headers,
        resolveWithFullResponse: true
      });

      const response = data['body'];


      //write data
      const resultsLocation = path.join(reportDir, `/projects.txt`);


      fs.outputJson(resultsLocation, data, {
          spaces: 2
        })
        .then(() => console.log(`Saved response from ${sonarqubeApi}  to ${resultsLocation}`))
        .catch(err => {
          console.log(err)
        })


      if (response["paging"]["total"] > response['paging']['pageSize']) {
        console.log("No paging implemented, too many projects per url - limit is 500");
        reject("reject");
      }

      var result = [];

      for (var i = 0; i < response["components"].length; i++) {
        if (response["components"][i]["tags"].indexOf("master") >= 0) {
          result.push(response["components"][i]);
        }
      }




      resolve(result);
    } catch (err) {
      if (err.name === "StatusCodeError") {
        console.log(`We have received a bad status from the sonarqube request - ${err.message}, please check the SONARQUBE_TOKEN and SONARQUBE_API parameters`);
      } else {

        console.log(err);
      }
      reject("reject");
    }

  });
}



const getProjectStats = async (projects, reportDir) => {


  return new Promise(async (resolve, reject) => {
    try {

      projectKeys = "";
      do_not_count_coverage = ","
      for (var i = 0; i < projects.length; i++) {
        projectKeys = projectKeys + projects[i]["key"] + ",";
        if (projects[i]["tags"].indexOf("do-not-report-coverage") >= 0) {
          do_not_count_coverage = do_not_count_coverage + projects[i]["key"] + ",";
        }
      }

      projectKeys = projectKeys.substring(0, projectKeys.length - 1);

      console.log(`Projectkeys are ${projectKeys}`);
      if (do_not_count_coverage.length > 2) {
        console.log(`Extracted list of projects for this url  coverage ${do_not_count_coverage}`);
      }

      const sonarqubeApi = process.env.SONARQUBE_API_URL + "/api/measures/search";
      var headers;

      if (process.env.SONARQUBE_TOKEN != null && process.env.SONARQUBE_TOKEN != "") {
        auth = "Basic " + new Buffer(process.env.SONARQUBE_TOKEN + ":").toString("base64");
        headers = {
          "Authorization": auth
        }
      }
      const response = await request({
        method: 'GET',
        uri: sonarqubeApi,
        qs: {
          'projectKeys': projectKeys,
          'metricKeys': 'bugs,reliability_rating,vulnerabilities,security_rating,code_smells,sqale_rating,lines_to_cover,uncovered_lines,duplicated_lines,lines'
        },
        json: true,
        headers: headers,
        resolveWithFullResponse: true
      });

      const resultsLocation = path.join(reportDir, `/measures.txt`);


      fs.outputJson(resultsLocation, response, {
          spaces: 2
        })
        .then(() => console.log(`Saved response from ${sonarqubeApi}  to ${resultsLocation}`))
        .catch(err => {
          console.log(err)
        });


      data = response["body"];

      stats = {
        'bugs': 0,
        'reliability_rating': 1,
        'vulnerabilities': 0,
        'security_rating': 1,
        'code_smells': 0,
        'sqale_rating': 1,
        'lines_to_cover': 0,
        'uncovered_lines': 0,
        'duplicated_lines': 0,
        'lines': 0,
        'non_duplication_rating': 100,
        'coverage_rating': 100
      };


      for (var i = 0; i < data["measures"].length; i++) {

        measure = data["measures"][i];
        value = parseFloat(measure["value"]);

        if ((measure["metric"] === 'reliability_rating') || (measure["metric"] === 'security_rating') || (measure["metric"] === 'sqale_rating')) {
          if (value > stats[measure["metric"]]) {
            stats[measure["metric"]] = value;

          }
        } else {
          if ((measure["metric"] === "lines_to_cover" || measure["metric"] === "uncovered_lines") && do_not_count_coverage.indexOf("," + measure["component"] + ",") >= 0) {
            console.log(`Skipping adding coverage stats (${measure["metric"]}) from ${measure["component"]} `);
          } else {
            stats[measure["metric"]] = stats[measure["metric"]] + value;
          }
        }
      }

      if (stats['lines'] > 0) {
        stats['non_duplication_rating'] = 100 - (stats['duplicated_lines'] * 100 / stats['lines']);
      }
      if (stats['lines_to_cover'] > 0) {

        stats['coverage_rating'] = 100 - (stats['uncovered_lines'] * 100 / stats['lines_to_cover']);
      }

      stats['reliability_rating'] = 100 - (stats['reliability_rating'] - 1) * 25;
      stats['security_rating'] = 100 - (stats['security_rating'] - 1) * 25;
      stats['sqale_rating'] = 100 - (stats['sqale_rating'] - 1) * 25;

      const statsLocation = path.join(reportDir, `/stats.json`);

      fs.outputJson(statsLocation, stats, {
          spaces: 2
        })
        .then(() => console.log(`Saved stats  to ${statsLocation}`))
        .catch(err => {
          console.log(err)
        })

      resolve(stats);
    } catch (err) {
      if (err.name === "StatusCodeError") {
        console.log(`We have received a bad status from the sonarqube request - ${err.message}, please check the SONARQUBE_TOKEN and SONARQUBE_API parameters`);
      } else {

        console.log(err);
      }
      reject("reject");
    }

  });
}



const getData = async (options) => {
  const {
    url
  } = options.url_settings;

  var result = {}


  return new Promise(async (resolve, reject) => {

    const {
      reportDir
    } = options;
    var stats;
    tag = getTag(url);
    const reportDirNow = garie_plugin.utils.helpers.reportDirNow(reportDir);
    projects = await getProjectsByTag(tag, reportDirNow);

    if (projects != null && projects.length > 0) {
      stats = await getProjectStats(projects, reportDirNow);
      console.log(`Received for ${url} stats ${JSON.stringify(stats)} `);

    } else {
      console.log(`No sonarqube projects found for ${url}`);
      reject("reject");
    }

    resolve(stats);

  });
};




console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', {
  icons: true
}));

const main = async () => {

  garie_plugin.init({
    db_name: "sonarqube",
    getData: getData,
    plugin_name: "sonarqube",
    report_folder_name: 'sonarqube-results',
    app_root: path.join(__dirname, '..'),
    config: config
  });

}

if (process.env.ENV !== 'test') {
  app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    await main();
  });
}
