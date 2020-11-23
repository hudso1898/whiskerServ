var idGen = require('./id.js');
var mongoclient = require("mongodb").MongoClient;
// MongoDB connection
// syntax: mongodb://<user>:<password>@<host>/<db>
var uri = "mongodb://whisker:whisker@127.0.0.1:27017/whisker?retryWrites=true&w=majority";
function animalModule(app, dbName) {
    /*
    {
        uid: user id,
        sid: session id,
        pid: provider id,
        ...
        animal fields 
        ...
    }
    */
    app.post('/add/animal', (req,res) => {
        if (!req.body.uid || !req.body.sid || !req.body.pid) {
            res.status(400).send('Missing request fields');
            return;
        }
        mongoclient.connect(uri, (err,db) => {
            if (err) {
                res.contentType('application/json').status(500).send('DB connection failed');
                return;
            }
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid}).toArray((err, results) => {
                if (results.length > 0) {
                    animalDoc = Object.assign(req.body, {id: idGen.generateSessionId()});
                    delete animalDoc.uid;
                    delete animalDoc.sid;

                    dbo.collection('animals').insertOne(animalDoc, (err,result) => {
                        if (err) throw err;
                        res.status(200).send({ ok: true });
                        db.close();
                    });
                }
                else {
                    res.write(JSON.stringify({ok: false, message: "invalid credentials"}));
                    db.close();
                    res.end();
                }
            });
        });
    });
    
    /*
        Get all the animals of the specified provider, return as list
    */
    app.get('animals/:pid', (req,res) => {
        mongoclient.connect(uri, (err, db) => {
            if (err) {
                res.contentType('application/json').status(500).send('DB connection failed');
                return;
            }
            var dbo = db.db(dbName);
            dbo.collection('animals').find({pid: req.params.pid}).toArray((err, results) => {
                if (results && results.length > 0) {
                    res.status(200).send(results);
                }
                else {
                    res.status(200).send([]);
                }
                db.close();
            });
        });
    });
}

module.exports = {
    animal: animalModule
}
