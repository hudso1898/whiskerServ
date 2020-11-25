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
            dbo.collection('users').find({id: req.body.uid, sessionId: req.body.sid}).toArray((err, results) => {
                if (results.length > 0) {
                    animalDoc = Object.assign(req.body, {});
                    delete animalDoc.uid;
                    delete animalDoc.sid;

                    dbo.collection('animals').insertOne(animalDoc, (err,result) => {
                        if (err) throw err;
                        res.status(200).send({ success: true });
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

    /*
        Get a bunch of animals from the db, in pages of 50
    */
   app.get('animals/page/:pageNum', (req,res) => {
    if(req.params.pageNum <= 0) {
        res.status(400).send('Bad page num');
        return;
    }
    mongoclient.connect(uri, (err, db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
            return;
        }
        var dbo = db.db(dbName);
        dbo.collection('animals').find().skip((pageNum - 1) * 100).limit(100).toArray((err, result) => {
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