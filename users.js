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
                return;
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

            if (req.body.providerId) {
                dbo.collection('providers').find({id: req.body.providerId}).toArray((err, result) => {
                    if (!result || result.length === 0) {
                        res.status(200).send({ok: false, message: "No matching provider id"});
                        db.close();
                    }
                    else {
                        dbo.collection('users').find({providerId: req.body.providerId}).toArray((err, result2) => {
                            if (result2 && result2.length > 0) {
                                res.status(200).send({ok: false, message: "Provider user account already exists"});
                                db.close();
                            }
                            else {
                                userDoc = Object.assign(userDoc, {
                                    providerId: req.body.providerId,
                                    verified: true,
                                    verifyId: ''
                                });
                                dbo.collection('users').insertOne(userDoc, (err,result) => {
                                    if (err) throw err;
                                    res.status(200).send({ success: true });
                                    db.close();
                                });
                            }  
                        });
                    }
                });
            }
            else {
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
        }
	});
	}
    });
});

// provider apply
app.post('/apply/provider', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            let provApplication = Object.assign(req.body, {
                id: idGen.generateSessionId(),
                pending: true
            });
            dbo.collection('providerApplications').insertOne(provApplication, (err,result) => {
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
                    to: 'whiskerdevs@gmail.com',
                    subject: 'New Provider Application - ' + req.body.name,
                    html: fs.readFileSync('./provApplication.html', { encoding: 'utf-8'}).replace('DETAILS', JSON.stringify(provApplication, undefined, 1))
                  };
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        res.status(404).send({ success: false, message: "Error connecting to mail server!" });
                    } else {
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
                            to: [provApplication.email, provApplication.contactEmail],
                            subject: 'Provider Application Confirmation',
                            html: fs.readFileSync('./confirmApplication.html', { encoding: 'utf-8'}).replace('NAME', provApplication.name)
                          };
                          transporter.sendMail(mailOptions, function(error, info){
                            if (error) {
                                res.status(404).send({ success: false, message: "Error connecting to mail server!" });
                            } else {
                                res.status(200).send({ success: true });
                            }
                        });
                    }
                  });
                db.close();
            });
        }
	});
});


// get applications
app.post('/applications/provider', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid, admin: true}).toArray((err, result) => {
                if (result && result.length > 0) {
                    dbo.collection('providerApplications').find({pending: true}).toArray((err, result2) => {
                        res.status(200).send({ok: true, applications: result2});
                        db.close();
                    });
                }
                else {
                    res.status(200).send({ok: false, message: "Invalid request credentials"});
                    db.close();
                }
            });
        }
    });
});
// provider apply
app.post('/apply/provider/accept', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid, admin: true}).toArray((err, result) => {
                if (result && result.length > 0) {
                    dbo.collection('providerApplications').find({id: req.body.applicationId, pending: true}).toArray((err, result2) => {
                        if (result2 && result2.length > 0) {
                            let provDoc = result2[0];
                            dbo.collection('providers').insertOne(provDoc, (err, result3) => {
                                dbo.collection('providerApplications').updateOne({id: provDoc.id}, {$set: {pending: false}}, (err, result4) => {
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
                                        to: [provDoc.email, provDoc.contactEmail],
                                        subject: 'Your provider application has been approved!',
                                        html: fs.readFileSync('./applicationApproved.html', { encoding: 'utf-8'}).replace('NAME', provDoc.name)
                                        .replace('VERIFYURL', 'https://whiskerapp.org/register?pid=' + provDoc.id)
                                      };
                                      transporter.sendMail(mailOptions, function(error, info){
                                        if (error) {
                                            res.status(404).send({ ok: false, message: "Error connecting to mail server!" });
                                        } else {
                                            res.status(200).send({ ok: true });
                                        }
                                      });
                                    db.close();
                                });
                            });
                        }
                        else {
                            res.status(200).send({ok: false, message: "No pending application for this provider"});
                            db.close();
                        }
                    });
                }
                else {
                    res.status(200).send({ok: false, message: "Invalid request credentials"});
                    db.close();
                }
            });
        }
    });
});

// provider deny
app.post('/apply/provider/deny', (req,res) => {
    mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid, admin: true}).toArray((err, result) => {
                if (result && result.length > 0) {
                    dbo.collection('providerApplications').find({id: req.body.applicationId, pending: true}).toArray((err, result2) => {
                        if (result2 && result2.length > 0) {
                            dbo.collection('providerApplications').deleteOne({id: req.body.applicationId, pending: true}, (err, result3) => {
                                res.status(200).send({ok: true});
                                db.close();
                            });
                        }
                        else {
                            res.status(200).send({ok: false, message: "No pending application for this provider"});
                            db.close();
                        }
                    });
                }
                else {
                    res.status(200).send({ok: false, message: "Invalid request credentials"});
                    db.close();
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
                            res.write(JSON.stringify({valid: true, username: user.username, firstname: user.firstname, lastname: user.lastname, email: user.email, id: user.id, sessionId: sessionId, expDate: expDate,
                                preferences: (user.preferences) ? user.preferences : {}, admin: (user.admin) ? user.admin : false, providerId: (user.providerId) ? user.providerId : undefined, imageUrl: (user.imageUrl) ? user.imageUrl : undefined,
                                favorites: (user.favorites) ? user.favorites : undefined}));
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
                            res.write(JSON.stringify({valid: true, username: user.username, email: user.email, firstname: user.firstname, lastname: user.lastname, id: user.id, sessionId: sessionId, expDate: expDate,
                                preferences: (user.preferences) ? user.preferences : {}, admin: (user.admin) ? user.admin : false, providerId: (user.providerId) ? user.providerId : undefined, imageUrl: (user.imageUrl) ? user.imageUrl : undefined,
                                favorites: (user.favorites) ? user.favorites : undefined}));
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
			let user = (result && result.length > 0) ? result[0] : {};
                            res.status(200).send({valid: true, username: user.username, email: user.email, firstname: user.firstname, lastname: user.lastname, id: user.id, sessionId: sessionId, expDate: expDate,
                                 preferences: (user.preferences) ? user.preferences : {}, admin: (user.admin) ? user.admin : false, providerId: (user.providerId) ? user.providerId : undefined, imageUrl: (user.imageUrl) ? user.imageUrl : undefined,
                                 favorites: (user.favorites) ? user.favorites : undefined});
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

/*
    Get a provider by id
*/
app.get('/provider/:id', (req,res) => {
    mongoclient.connect(uri, (err, db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
            return;
        }
        var dbo = db.db(dbName);
        dbo.collection('providers').find({id: req.params.id}).toArray((err, results) => {
            if (results && results.length > 0) {
                res.status(200).send(results[0]);
            }
            else {
                res.status(200).send({});
            }
            db.close();
        });
    });
});

/*
    Add an animal to the user's favorites
*/

app.post('/favorites/add/:aid', (req,res) => {
    if(!req.body.uid || !req.body.sid) {
        res.status(400).send({ok: false, message: "Must provide user credentials (uid, sid)"});
        return;
    }
    mongoclient.connect(uri, (err, db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
            return;
        }
        var dbo = db.db(dbName);
        dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid}).toArray((err, results) => {
            if (!results || results.length === 0) {
                res.status(200).send({ok: false, message: "Invalid user credentials"});
            }
            let user = results[0];
            if (!user.favorites || user.favorites.length === 0) {
                dbo.collection('users').updateOne({id: req.body.uid}, {$set: {favorites: [req.params.aid]}}, (e, ok) => {
                    res.status(200).send({ok: true});
                    db.close();
                });
            }
            else {
                if (user.favorites.findIndex((elem) => {return (elem === req.params.aid)}) !== -1) {
                    res.status(200).send({ok: false, message: "animal is already a favorite"});
                    db.close();
                }
                else {
                    dbo.collection('users').updateOne({id: req.body.uid}, {$push: {favorites: req.params.aid}}, (e, ok) => {
                        res.status(200).send({ok: true});
                        db.close();
                    })
                }
            }
        });
    });
});

}

module.exports = {
    users: users
}
