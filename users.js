const fs = require("fs"), bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

var mongoclient = require("mongodb").MongoClient;

var idGen = require('./id.js');

// MongoDB connection
// syntax: mongodb://<user>:<password>@<host>/<db>
var uri = "mongodb://whisker:whisker@127.0.0.1:27017/whisker?retryWrites=true&w=majority";


// users endpoints
function users(app, dbName) {
    // Users API
app.post('/users/adduser', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
		dbo.collection('users').find({ $or: [ { username: req.body.username }, {email: req.body.email}]}).toArray((err, result) => {
	    
            if (result.length !== 0) {
                res.status(400).send({error: 'This username or email is already in use!'});
            }
            else {
                let verifyId = idGen.generateSessionId();
                let userDoc = {
                id: idGen.generateSessionId(),
                username: req.body.username,
                password: bcrypt.hashSync(req.body.password, 10),
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                verified: false,
                verifyId: verifyId
            }

            // todo
            // need to update this to use whisker's account, not practirios
            dbo.collection('users').insertOne(userDoc, (err,result) => {
                if (err) throw err;
                let transporter =  nodemailer.createTransport(smtpTransport({
                    service: 'gmail',
                    host: 'smtp.gmail.com',
                    auth: {
                      user: 'whiskerdevs@gmail.com',
                      pass: 'ckhshfqjmofjskoi'
                    }
                  }));
                  let mailOptions = {
                    from: 'Whisker <no-reply@whiskerapp.org>',
                    to: req.body.email,
                    subject: 'Verify your Whisker Account',
                    html: fs.readFileSync('./verifyEmail.html', { encoding: 'utf-8'}).replace('VERIFYURL', 'https://www.whiskerapp.org/verify?vid=' + verifyId)
                    .replace('FIRSTNAME', userDoc.firstname).replace('LASTNAME', userDoc.lastname)
                  };
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        res.status(404).send({ success: false, message: "Error connecting to mail server!" });
                    } else {
                        res.status(200).send({ success: true });
                    }
                    res.end();
                  });
                db.close();
            });
            }
	});
	}
    });
});
app.post('/verifyUser', (req,res) => {
    mongoclient.connect(uri, (err, db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            let provVerifyId = req.body.verifyId;
            dbo.collection('users').find({ verifyId: provVerifyId }).toArray((err, result) => {
                if(result && result.length > 0) {
                    for (let user of result) {
                        dbo.collection('users').updateOne({verifyId: provVerifyId}, { $set: {verified: true, verifyId: ''}}, (err, result2) => {
                            res.contentType('application/json').status(200).send({ ok: true});
                        });
                    }
                }
                else {
                    res.contentType('application/json').status(200).send({ ok: false});
                }
                db.close();
            });
        }
    });
});
app.post('/verifySession', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            let provUid = req.body.id;
            let provSid = req.body.sessionId;
            if (provUid !== undefined && provSid !== undefined) {
                dbo.collection('users').find({ $and: [{id: { $eq: provUid}}, {currentSessionId: {$eq: provSid}}]}).toArray((err, result) => {
                    if (result && result.length > 0) {
                        for(let user of result) {
                            if(new Date(user.expDate).getTime() > Date.now()) {
                                res.contentType('application/json').status(200).send({ok: true});
                            } 
                            else {
                                res.contentType('application/json').status(200).send({ok: false, expired: true});
                            }
                        }
                    }
                    else {
                        res.contentType('application/json').status(200).send({ok: false});
                    }
                    db.close();
                })
            }
            else {
                res.contentType('application/json').status(400).send({message: 'Invalid request schema'});
            }
        }
    });
});

/*
    Not relevant to Whisker, but gives you an idea of a privileged operation (give your username and session id, return info about that user account)
*/
// app.post('/userInfo', (req,res) => {
//     mongoclient.connect(uri, (err,db) => {
//         if (err) {
//             res.contentType('application/json').status(500).send('DB connection failed');
//         }
//         else {
//             var dbo = db.db(dbName);
//             let provUid = req.body.id;
//             let provSid = req.body.sessionId;
//             if (provUid !== undefined && provSid !== undefined) {
//                 dbo.collection('users').find({ $and: [{id: { $eq: provUid}}, {currentSessionId: {$eq: provSid}}]}).toArray((err, result) => {
//                     if (result && result.length > 0) {
//                         for(let user of result) {
//                             if(new Date(user.expDate).getTime() > Date.now()) {
//                                 res.contentType('application/json').status(200).send({
//                                     studios: (user.studios !== undefined) ? user.studios : [],
//                                     ensembles: (user.ensembles !== undefined) ? user.ensembles : [],
//                                     profiles: (user.profiles !== undefined) ? user.profiles : [] 
//                                 });
//                             } 
//                             else {
//                                 res.contentType('application/json').status(200).send({ok: false, expired: true});
//                             }
//                         }
//                     }
//                     else {
//                         res.contentType('application/json').status(200).send({ok: false});
//                     }
//                     db.close();
//                 })
//             }
//             else {
//                 res.contentType('application/json').status(400).send({message: 'Invalid request schema'});
//             }
//         }
//     });
// });

app.post('/users/login', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            let provUsername = req.body.username;
            dbo.collection('users').find({ $or: [ { username: provUsername}, { email: provUsername } ] }).toArray((err, result) => {
                if(result && result.length > 0) {
                    for (let user of result) {
                        if(bcrypt.compareSync(req.body.password, user.password)) {
				if (!user.verified) {
                    res.writeHead(200, {ContentType: 'application/json'});
					res.write(JSON.stringify({valid: false, message: 'User account not verified, please check your email.'}));
					db.close();
					res.end();
				}
				else {
                            let sessionId;
				if (user.currentSessionId !== undefined && user.expDate.getTime() > Date.now()) {
					sessionId = user.currentSessionId;
				}
				else {
					sessionId = idGen.generateSessionId();
				}
                            let expDate = new Date();
                            if (!req.body.staySignedIn) {
                                expDate.setTime(expDate.getTime() + (1000 * 3600));
                             }
                             else {
                                expDate.setTime(expDate.getTime() + (24000 * 3600 * 30));
                             } 
                            dbo.collection('users').updateOne({ $or: [ {username: provUsername}, {email: provUsername} ] }, { $set: { currentSessionId: sessionId, expDate: expDate }}, (err, result) => {
                                res.writeHead(200, {ContentType: 'application/json'});
                            res.write(JSON.stringify({valid: true, username: user.username, firstname: user.firstname, lastname: user.lastname, id: user.id, sessionId: sessionId, expDate: expDate}));
                            db.close();
                            res.end();
			    });
				}
                        }
                        else {
                            res.writeHead(200, {ContentType: 'application/json'});
                            if(user.password !== "*") res.write(JSON.stringify({valid: false, message: 'Invalid username/password.'}));
                            else res.write(JSON.stringify({valid: false, message: "Please login through Google/Faceboook."}));
                            db.close();
                            res.end();
                        }
                    }
                }
                else {
                    res.writeHead(200, {ContentType: 'application/json'});
                    res.write(JSON.stringify({valid: false, message: 'Invalid username/password.'}));
                    db.close();
                    res.end();
                }
            });
        }
    });
});

app.post('/oauthLogin', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            let id = req.body.userId;
            dbo.collection('users').find({$or: [{id: id}, {email: req.body.email}]}).toArray((err, result) => {
                // user is already in the system
                if (result && result.length > 0) {
                    let user = result[0];
                    if (!user.verified) {
                        res.writeHead(200, {ContentType: 'application/json'});
                        res.write(JSON.stringify({valid: false, message: 'User account not verified, please check your email.'}));
                        db.close();
                        res.end();
                    }
                    else {
                        let sessionId;
                        if (user.currentSessionId !== undefined && user.expDate.getTime() > Date.now()) {
                            sessionId = user.currentSessionId;
                        }
                        else {
                            sessionId = idGen.generateSessionId();
                        }
                        let expDate = new Date();
                        expDate.setTime(req.body.expires);
                        dbo.collection('users').updateOne({$or: [{id: id}, {email: req.body.email}]}, { $set: { currentSessionId: sessionId, expDate: expDate }}, (err, result) => {
                            res.writeHead(200, {ContentType: 'application/json'});
                            res.write(JSON.stringify({valid: true, username: user.username, firstname: user.firstname, lastname: user.lastname, id: user.id, sessionId: sessionId, expDate: expDate}));
                            db.close();
                            res.end();
                        });
                    }
                }
                // user is not in the system
                else {
                    let userDoc = {
                        id: req.body.userId,
                        username: req.body.email,
                        password: "*", // this will never allow basic password authentication
                        email: req.body.email,
                        firstname: req.body.givenName,
                        lastname: req.body.familyName,
                        verified: true,
                        verifyId: "",
                        imageUrl: req.body.imageUrl
                    }
                    dbo.collection('users').insertOne(userDoc, (err,result) => {
                        if (err) throw err;
                            res.status(200).send({ valid: true });
                            db.close();
                    });
                }
            });
        }
    });
});
app.get('/get/user/:username', (req,res) => {
	mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            res.writeHead(200, {ContentType: 'application/json'});
		    var dbo = db.db(dbName);
		    dbo.collection('users').find({username: req.params.username}).toArray((err, results) => {
			    if (results.length > 0) {
				    res.write(JSON.stringify({found: true}));
			    }
			    else {
				    res.write(JSON.stringify({found: false}));
		    	}
			    db.close();
			    res.end();
		    });
        }
	});
});
}
module.exports = {
    users: users
}
