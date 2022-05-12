/***
Gateway/Reverse Proxy
The gateway is the entry point to the app; it provides a REST API so the front end can interact
with the backend.
***/
const express = require('express');
const path = require('path');
const http = require('http');
const winston = require('winston');
const { randomUUID } = require('crypto');
// const { lookup } = require('geoip-lite');

/******
Globals
******/
//Create a new express instance.
const app = express();
//When running an Express app behind a proxy, set the application variable 'trust proxy' to 'true.'
// app.set('trust proxy', true);
//
const SVC_NAME = "gateway";
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;

/***
Resume Operation
----------------
The resume operation strategy intercepts unexpected errors and responds by allowing the process to
continue.
***/
process.on('uncaughtException',
err => {
  logger.error(`${SVC_NAME} - Uncaught exception.`);
  logger.error(`${SVC_NAME} - ${err}`);
  logger.error(`${SVC_NAME} - ${err.stack}`);
})

/***
Abort and Restart
-----------------
***/
// process.on("uncaughtException",
// err => {
//   console.error("Uncaught exception:");
//   console.error(err && err.stack || err);
//   process.exit(1);
// })

//Winston requires at least one transport (location to save the log) to create a log.
const logConfiguration = {
  transports: [ new winston.transports.Console() ],
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSSSS' }),
    winston.format.printf(msg => `${msg.timestamp} ${msg.level} ${msg.message}`)
  ),
  exitOnError: false
}

//Create a logger and pass it the Winston configuration object.
const logger = winston.createLogger(logConfiguration);

/***
Unlike most other programming languages or runtime environments, Node.js doesn't have a built-in
special "main" function to designate the entry point of a program.

Accessing the main module
-------------------------
When a file is run directly from Node.js, require.main is set to its module. That means that it is
possible to determine whether a file has been run directly by testing require.main === module.
***/
if (require.main === module) {
  main()
  .then(() => {
    READINESS_PROBE = true;
    logger.info(`${SVC_NAME} - Microservice is listening on port "${PORT}"!`);
  })
  .catch(err => {
    logger.error(`${SVC_NAME} - Microservice failed to start.`);
    logger.error(`${SVC_NAME} - ${err}`);
    logger.error(`${SVC_NAME} - ${err.stack}`);
  });
}

function main() {
  //Display a message if any optional environment variables are missing.
  if (process.env.PORT === undefined) {
    logger.info(`${SVC_NAME} - The environment variable PORT for the HTTP server is missing; using port ${PORT}.`);
  }
  //Notify when server has started.
  return new Promise(resolve => {
    app.listen(PORT,
    () => {
      resolve();  //HTTP server is listening, resolve the promise.
    });
  });
}

/***
The user IP is determined by the following order:
 1. X-Client-IP
 2. X-Forwarded-For (Header may return multiple IP addresses in the format: "client IP, proxy1 IP, proxy2 IP", so take the the first one.)
    It's very easy to spoof:
    $ curl --header "X-Forwarded-For: 1.2.3.4" "http://localhost:3000"
 3. CF-Connecting-IP (Cloudflare)
 4. Fastly-Client-Ip (Fastly CDN and Firebase hosting header when forwared to a cloud function)
 5. True-Client-Ip (Akamai and Cloudflare)
 6. X-Real-IP (Nginx proxy/FastCGI)
 7. X-Cluster-Client-IP (Rackspace LB, Riverbed Stingray)
 8. X-Forwarded, Forwarded-For and Forwarded (Variations of #2)
 9. req.connection.remoteAddress
10. req.socket.remoteAddress
11. req.connection.socket.remoteAddress
12. req.info.remoteAddress
If an IP address cannot be found, it will return null.
***/
function getIP(req) {
  let ip = null;
  try {
    ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || null;
    /***
    When the OS is listening with a hybrid IPv4-IPv6 socket, the socket converts an IPv4 address to
    IPv6 by embedding it within the IPv4-mapped IPv6 address format. This format just prefixes the
    IPv4 address with :ffff: (or ::ffff: for older mappings).
    Is the IP an IPv4 address mapped as an IPv6? If yes, extract the Ipv4.
    ***/
    const regex = /^:{1,2}(ffff)?:(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/i;  //Ignore case.
    if (ip !== null && regex.test(ip)) {
      ip = ip.replace(/^.*:/, '');
    }
  }
  catch (err) {
    ip = null;
    logger.error(`${SVC_NAME} ${cid} - ${err}`);
  }
  return ip;
}

/***
Main web page for listing videos.

This route handler starts by requesting data from the metadata microservice. It then renders the
web page using the video-list template and input the list of videos as the template's data.
***/
app.get('/',
(req, res) => {
  const cid = randomUUID();
  const ip = getIP(req);
  logger.info(`${SVC_NAME} ${cid} - Received request from ${ip}: "/"`);
  res.send('Hello from /!');
});

/***
Web page for playing a particular video.

The streaming video passes through three microservices on its journey to the user.
External Cloud Storage -> video-storage -> video-streaming -> gateway -> web browser -> user
***/
app.get('/base1',
(req, res) => {
  const cid = randomUUID();
  const videoId = req.query.id;
  const ip = getIP(req);
  logger.info(`${SVC_NAME} ${cid} - Received request from ${ip}: "/base1".`);
  res.send('Hello from /base1!');
});

//Web page for showing the users viewing history.
app.get('/base2',
(req, res) => {
  const cid = randomUUID();
  const ip = getIP(req);
  logger.info(`${SVC_NAME} ${cid} - Received request from ${ip}: "/base2"`);
  res.send('Hello from /base2!');
});

//HTTP GET API to stream video to the user's browser.
app.get('/base3/base1',
(req, res) => {
  const cid = randomUUID();
  const ip = getIP(req);
  logger.info(`${SVC_NAME} ${cid} - Received request from ${ip}: "/base3/base1"`);
  res.send('Hello from /base3/base1!');
});

/***
The 404 Route
-------------
In Express, 404 responses are not the result of an error, so the error-handler middleware will not
capture them. This behavior is because a 404 response simply indicates the absence of additional
work to do; in other words, Express has executed all middleware functions and routes, and found
that none of them responded. All you need to do is add a middleware function at the VERY BOTTOM of
the stack (below all other functions) to handle a 404 response.
***/
app.use(
(req, res, next) => {
  logger.error(`${SVC_NAME} - Unable to find the requested resource (${req.url})!`);
  res.status(404).send(`<h1>Unable to find the requested resource (${req.url})!</h1>`);
});
