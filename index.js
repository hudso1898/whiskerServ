var express = require('express');

const https = require("https"), fs = require("fs"), url = require("url"), bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

var mongoclient = require("mongodb").MongoClient;

var idGen = require('./id.js');
var usersModule = require('./users.js');
var preferencesModule = require('./preferences.js');

// MongoDB connection
// syntax: mongodb://<user>:<password>@<host>/<db>
var uri = "mongodb://whisker:whisker@127.0.0.1:27017/whisker?retryWrites=true&w=majority";

// HTTPS options - uses our key pairs so that these transactions are encrypted and verified
// you need to run index/pm2 as root for this though!
const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/whiskerapp.org/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/whiskerapp.org/fullchain.pem"),
};
const app = express();

var bodyParser = require('body-parser');
const { AsyncLocalStorage } = require('async_hooks');
const e = require('express');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// this code allows CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", (req,res) => {
    res.writeHead(200, {ContentType: 'application/json'});
    let ret = {
        alive: true,
        name: "Whisker API",
        version: 0.1,
        endpoints: [
            {path: '/', method: 'GET', desc: 'diagnostic info'},
            {path: '/get/users', method: 'GET', desc: 'Gets array of usernames in the system'},
            {path: '/users/addUser', method: 'POST', desc: 'Adds user to the system'},
            {path: '/users/login', method: 'POST', desc: 'Attempts to login and returns result'}
        ]
    };
    res.write(JSON.stringify(ret));
    res.end();
});

const dbName = 'whisker';

usersModule.users(app, dbName);
preferencesModule.preferences(app, dbName, uri);

https.createServer(options, app).listen(9000, () => {
	console.log('Listening on port 9000')
});
