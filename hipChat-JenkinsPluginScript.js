var http = require('http');

//array of jobs you want to track from jenkins, need to be named the same way including spaces and capitalization
var jobsArray = [];

//host ip address, can be localHost, but you should use ip address because message which direct people to the last build online
var JENKINS_HOST = '';

//port for jenkins, if it is default you can leave this as a blank string
var JENKINS_PORT = '';

//hipChat URL. Go to: Home > Rooms > My Rooms > [The room you want to post jenkins messages to] >
// Intergrations > Build Your Own > [type name for your intergration], click create > copy url and paste as string below
var hipChatURL = '';

var jenkinsPath = function(appName) {
  return '/jenkins/job/' + encodeURIComponent(appName) + '/lastBuild/api/json';
};

var index = hipChatURL.indexOf('.com') + 4;

var hipChatBaseURL = hipChatURL.substr(0, index);
var hipChatPath = hipChatURL.substr(index);

var headers = {
  'Content-Type': 'application/json',
};

var options = {
  hostname: hipChatBaseURL,
  path: hipChatPath,
  method: 'POST',
  headers: headers
};

var jenkinsGetObject = function(appName, buildNumber) {
  var path = jenkinsPath(appName);
  if (buildNumber) {
    path = path.replace('lastBuild', buildNumber);
  }

  return {
    host: JENKINS_HOST,
    port: JENKINS_PORT,
    path: path,
  };
};

var failureDataObject = function(jenkinsDataObject) {
  return JSON.stringify({
    "color": "red",
    "message": jenkinsDataObject.fullDisplayName + " JENKINS build was a FAILURE (thumbsdown) check log at: " + jenkinsDataObject.url,
    "notify": true,
    "message_format": "text"
  });
};

var successDataObject = function(jenkinsDataObject) {
  return JSON.stringify({
    "color": "green",
    "message": "YAY " +  jenkinsDataObject.fullDisplayName + " JENKINS build was a SUCCESS (thumbsup), you're back in green. check log at: " + jenkinsDataObject.url,
    "notify": true,
    "message_format": "text"
  });
};

jobsArray.forEach(function(job) {
  getJenkinsData(job);
});

function getJenkinsData(job) {
  var appName = job;
  http.get(jenkinsGetObject(job),
    function(res) {
      var body = '';
      res.on('data', function(d) {
        body += d;
      });
      res.on('end', function() {
        body = JSON.parse(body);
        if(body.result === 'FAILURE') {
          postStuff(failureDataObject(body));
          return;
        }

        if (body.result === 'SUCCESS' && (Math.floor((Date.now() - (body.timestamp + body.duration))/60000) <= 1)){
          getPreviousJobData(appName, body);
        }
      });
    });
}

function getPreviousJobData(appName, jenkinsDataObject) {
  var buildNumber = (jenkinsDataObject.id - 1).toString();
  console.log(buildNumber);
  http.get(jenkinsGetObject(appName, buildNumber), function(res) {
    var body = '';
    res.on('data', function(d) {
      body += d;
    });
    res.on('end', function()  {
      body = JSON.parse(body);
      console.log(body.result);
      if(body.result === 'FAILURE'){
        console.log(body.result);
        postStuff(successDataObject(jenkinsDataObject));
      }
    });
  });
}

function postStuff(postObject) {
  var  postReq = http.request(options, function(res) {
      res.setEncoding('utf8');
      console.log('Status:', res.statusCode);
      res.on('data', function(body) {
        console.log('Body:', body);
      });
    });
    postReq.write(postObject);
    postReq.end();
}