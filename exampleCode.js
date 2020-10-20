// Example code for my other capstone - shows you how to do some of these transactions
// app = the express app
app.get('/get/studio/:name', (req,res) => {
	mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            res.writeHead(200, {ContentType: 'application/json'});
		    var dbo = db.db('practirio');
		    dbo.collection('studios').find({name: req.params.name}).toArray((err, results) => {
			    if (results.length > 0) {
				    res.write(JSON.stringify({found: true,
				    studio: results[0]}));
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

app.get('/get/studioById/:id', (req,res) => {
        mongoclient.connect(uri, (err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            res.writeHead(200, {ContentType: 'application/json'});
                    var dbo = db.db('practirio');
                    dbo.collection('studios').find({id: req.params.id}).toArray((err, results) => {
                            if (results.length > 0) {
                                    res.write(JSON.stringify({found: true,
                                    studio: results[0]}));
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

app.post('/search/studio/:name', (req,res) => {
    mongoclient.connect(uri, async(err, db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db('practirio');
            res.writeHead(200, {ContentType: 'application/json'});
            let tags = (req.body.tags !== undefined) ? req.body.tags : [];
            if(tags.length > 0) {
                 dbo.collection('studios').find({ $and: [{name: { $regex: req.params.name, $options: "i"}},
                                                   {tags: { $all: tags}}]
                }).toArray((err, result) => {
                    if (result && result.length > 0) {
                        let studios = result.map(studio => {
                            return {
                            name: studio.name,
                            tags: studio.tags,
                            description: studio.description,
                            imageUrl: studio.imageUrl
                            }
                        });
                        res.write(JSON.stringify(studios));
                    }
                    else {
                        res.write(JSON.stringify([]));
                    }
                    db.close();
                    res.end();
                });
            }
            else {
                dbo.collection('studios').find({name: { $regex: req.params.name, $options: "i"}
                }).toArray((err, result) => {
                    if (result && result.length > 0) {
                        let studios = result.map(studio => {
                            return {
                                name: studio.name,
                                tags: studio.tags,
                                description: studio.description,
                                imageUrl: studio.imageUrl
                            }
                        });
                        res.write(JSON.stringify(studios));
                    }
                    else {
                        res.write(JSON.stringify([]));
                    }
                    db.close();
                    res.end();
                });
            }
        }
    });
});

app.post('/addStudio', (req,res) => {
    mongoclient.connect(uri, async(err,db) => {
        if (err) {
            res.contentType('application/json').status(500).send('DB connection failed');
        }
        else {
            var dbo = db.db('practirio');
            dbo.collection('users').find({ $and: [{id: { $eq: req.body.userId}}, {currentSessionId: {$eq: req.body.sessionId}}]}).toArray((err, result) => {
                if (result && result.length > 0) {
                    dbo.collection('studios').find({ name: req.body.name }).toArray((err, result) => {
	    
                        if (result.length !== 0) {
                            res.status(400).send({error: 'Sorry, this studio name is taken. Try another.'});
                        }
                        else {
                         let studioDoc = {
                           id: idGen.generateSessionId(),
                           name: req.body.name,
                           description: req.body.description,
                           tags: req.body.tags,
                           instructors: [{
                            id: req.body.userId,
                            profile: {}
                           }],
                           assistants: [],
                           students: [],
			   imageUrl: "https://www.practirio.com/images/studioProfiles/default.png"
                           }
                         dbo.collection('studios').insertOne(studioDoc, (err,result) => {
                            if (err) throw err;
			    dbo.collection('users').updateOne({ id: req.body.userId}, {$push: { studios: studioDoc.id }}, (err, result) => {
				if (err) throw err;
				res.status(200).send({ success: true });
				db.close();
			    });
                         });
                        }
                    });
                }
                else {
                    res.status(400).send('Invalid credentials.');
                }
            });
        }
    });
});