const garie_plugin = require('garie-plugin');
const path = require('path');
const fs = require('fs-extra');
const dateFormat = require('dateformat');
const config = require('../config');
const request = require('request-promise');
const express = require('express');
const serveIndex = require('serve-index');
const urlparser = require('url');

const getMonitors = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      var date = new Date();
      date.setHours(0, 0, 0, 0);
      var end_interval = date.getTime() / 1000 | 0;
      var start_interval = end_interval - 86400 * parseInt(process.env.UPTIME_INTERVAL_DAYS || 30);


      const keys = process.env.UPTIME_ROBOT_KEYS;
      const uptime_monitor_url = process.env.UPTIME_API_URL;

      date = new Date();
      const resultsLocation = path.join(__dirname, '../reports/', dateFormat(date, "isoUtcDateTime"), '/monitors.json');


      var monitors = {};

      var tmp_keys = keys.split(' ');
      for (var i = 0; i < tmp_keys.length; i++) {
        var key = tmp_keys[i];
        data = await request({
          method: 'POST',
          uri: uptime_monitor_url,
          body: {
            'api_key': `${key}`,
            'format': 'json',
            'custom_uptime_ranges': `${start_interval}_${end_interval}`
          },
          json: true,
          resolveWithFullResponse: true,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        monitors = data['body']['monitors'].concat(monitors);
      }
      fs.outputJson(resultsLocation, monitors)
        .then(() => console.log(`Saved sonarqube monitors json to ${resultsLocation}`))
        .catch(err => {
          console.log(err)
        })



      resolve(monitors);
    } catch (err) {
      console.log(err);
      reject("reject");
    }

  });
}


function getTag(url){
        urlObject = urlparser.parse(url)
	return (urlObject.hostname+urlObject.path.replace("/","-")).toLowerCase() ;
}



const getProjectsByTag = async (tag) => {
{

  return new Promise(async (resolve, reject) => {
    try {

      const sonarqubeApi = process.env.SONARQUBE_API_URL+"/api/components/search_projects";


        data = await request({
          method: 'GET',
          uri: sonarqubeApi,
          body: {
            'ps':  500, //maximum 
            'filter': `tags%20%3D%20${tag}`
          },
          json: true,
          resolveWithFullResponse: true
        });


      if ( data["paging"]["total"] > 500 ) {
              console.log("No paging implemented, too many projects per url - limit is 500");
              reject("reject");
      }

      resolve(data["components"]);
    } catch (err) {
      console.log(err);
      reject("reject");
    }

  });
}



const getProjectStats = async (projects) => {
{

  return new Promise(async (resolve, reject) => {
    try {
  
    projectKeys="";
    do_not_count_coverage=","
    for (var i = 0; i < projects.length; i++) {
        projectKeys=projectKeys+projects[i]["key"])+",";
        if ( projects[i]["tags"].indexOf("do-not-report-coverage") >=0 ) 
	{
		do_not_count_coverage=do_not_count_coverage+projects[i]["key"];
	}
    }
 
       projectKeys=projectKeys.substring(0, projectKeys.length-1);


      const sonarqubeApi = process.env.SONARQUBE_API_URL+"/api/measures/search";


        data = await request({
          method: 'GET',
          uri: sonarqubeApi,
          body: {
            'projectKeys':  projectKeys,
            'metricKeys': 'bugs,reliability_rating,vulnerabilities,security_rating,code_smells,sqale_rating,duplicated_lines_density,coverage,lines_to_cover,uncovered_lines'
          },
          json: true,
          resolveWithFullResponse: true
        });


       
         stats={'bugs':0,'reliability_rating':1,'vulnerabilities':0,'security_rating':1,'code_smells':0,'sqale_rating':1,'duplicated_lines_density':0, 'coverage':0, 'lines_to_cover': 0, 'uncovered_lines': 0 }


          for (var i = 0; i < data["measures"].length; i++) {

           measure=data["measures"][i];
    
	  if (measure["metric"] === 'reliability_rating') || (measure["metric"] === 'security_rating' ) ||  (measure["metric"] === 'sqale_rating' ){
              if (measure["value"] > stats[measure["metric"]] ) {
	          stats[measure["metric"]]=measure["value"];

	      }
	  }
	  else{
               if ( measure["value"] != "lines_to_cover" &&  measure["value"] != "uncovered_lines" && do_not_count_coverage.indexOf(","+measure["component"]+",") == 0 )
		   	stats[measure["metric"]]=stats[measure["metric"]]+measure["value"];
	  }


             resolve(stats);
    } catch (err) {
      console.log(err);
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


  // calculez cum e tag-ul
	  //
    tag = getTag(url);

    projects = getProjectsByTag(tag);


    stats = getProjectStats(projects);

    result['bug_sum']=stats["bugs"];
    result['bug_score']=stats['reliability_rating']/projects.length;  


    resolve(result);

  });
};


console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', { icons: true }));

const main = async () => {


 global.noCoverage = await getProjectsByTag("do-not-report-coverage");


  garie_plugin.init({
    database: "sonarqube",
    getData: getData,
    app_name: 'sonarqube',
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
