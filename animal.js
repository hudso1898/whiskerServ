function animalModule(app, dbName) {
    /*
    {
        provId: string,
        provSessionId: string,
        animalInfo: Object (all the animal traits)
    }
    */
    app.post('/animal/add', (req,res) => {
        mongoclient.connect(uri, (err,db) => {
            if (err) {
                res.contentType('application/json').status(500).send('DB connection failed');
                return;
            }
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.provId, sessionId: req.body.provSessionId}).toArray((err, results) => {
                if (results.length > 0) {
                        // 
                }
                else {
                    res.write(JSON.stringify({ok: false, message: "invalid credentials"}));
                    db.close();
                    res.end();
                }
            });
        });
    });
}

module.exports = {
    animal: animalModule
}